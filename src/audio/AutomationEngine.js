/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AutomationEngine.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Automation Engine
 * Provides timeline-based parameter automation with bezier curve interpolation
 * Supports real-time recording, playback, and professional editing tools
 */

export class AutomationPoint {
  constructor(time, value, curveType = 'linear', tension = 0) {
    this.time = time;  // Time in seconds
    this.value = value;  // Normalized value 0-1
    this.curveType = curveType;  // 'linear', 'bezier', 'hold', 'exponential'
    this.tension = tension;  // Curve tension for bezier curves
    this.selected = false;
    this.id = this.generateId();
  }

  generateId() {
    return 'ap_' + Math.random().toString(36).substr(2, 9);
  }

  clone() {
    const point = new AutomationPoint(this.time, this.value, this.curveType, this.tension);
    point.selected = this.selected;
    return point;
  }
}

export class AutomationLane {
  constructor(parameterId, parameterName, minValue = 0, maxValue = 1, defaultValue = 0.5) {
    this.id = parameterId;
    this.name = parameterName;
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.defaultValue = defaultValue;
    this.points = [];
    this.enabled = true;
    this.recording = false;
    this.visible = true;
    this.locked = false;
    this.group = null;
    this.color = this.generateColor();
    
    // Add default point at time 0
    this.addPoint(new AutomationPoint(0, this.normalizeValue(defaultValue)));
  }

  generateColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  normalizeValue(value) {
    return (value - this.minValue) / (this.maxValue - this.minValue);
  }

  denormalizeValue(normalizedValue) {
    return this.minValue + (normalizedValue * (this.maxValue - this.minValue));
  }

  addPoint(point) {
    // Insert point in chronological order
    let insertIndex = this.points.findIndex(p => p.time > point.time);
    if (insertIndex === -1) {
      this.points.push(point);
    } else {
      this.points.splice(insertIndex, 0, point);
    }
    return point;
  }

  removePoint(pointId) {
    const index = this.points.findIndex(p => p.id === pointId);
    if (index > 0) {  // Protect first point
      this.points.splice(index, 1);
      return true;
    }
    return false;
  }

  getValueAtTime(time) {
    if (!this.enabled || this.points.length === 0) {
      return this.denormalizeValue(this.normalizeValue(this.defaultValue));
    }

    // Find surrounding points
    let beforePoint = this.points[0];
    let afterPoint = this.points[this.points.length - 1];

    for (let i = 0; i < this.points.length - 1; i++) {
      if (this.points[i].time <= time && this.points[i + 1].time > time) {
        beforePoint = this.points[i];
        afterPoint = this.points[i + 1];
        break;
      }
    }

    // If time is before first point or after last point
    if (time <= this.points[0].time) {
      return this.denormalizeValue(this.points[0].value);
    }
    if (time >= this.points[this.points.length - 1].time) {
      return this.denormalizeValue(this.points[this.points.length - 1].value);
    }

    // Interpolate between points
    return this.denormalizeValue(this.interpolateValue(beforePoint, afterPoint, time));
  }

  interpolateValue(pointA, pointB, time) {
    const timeDelta = pointB.time - pointA.time;
    if (timeDelta === 0) return pointA.value;

    const t = (time - pointA.time) / timeDelta;

    switch (pointA.curveType) {
      case 'hold':
        return pointA.value;

      case 'linear':
        return pointA.value + (pointB.value - pointA.value) * t;

      case 'exponential':
        const curve = pointA.tension || 2;
        return pointA.value + (pointB.value - pointA.value) * Math.pow(t, curve);

      case 'bezier':
        return this.bezierInterpolation(pointA.value, pointB.value, t, pointA.tension);

      default:
        return pointA.value + (pointB.value - pointA.value) * t;
    }
  }

  bezierInterpolation(startValue, endValue, t, tension = 0) {
    // Cubic bezier with configurable tension
    const controlPoint1 = tension;
    const controlPoint2 = 1 - tension;
    
    const oneMinusT = 1 - t;
    const tSquared = t * t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    
    return oneMinusTSquared * oneMinusT * startValue +
           3 * oneMinusTSquared * t * (startValue + controlPoint1 * (endValue - startValue)) +
           3 * oneMinusT * tSquared * (endValue + controlPoint2 * (startValue - endValue)) +
           tSquared * t * endValue;
  }

  clearSelection() {
    this.points.forEach(point => point.selected = false);
  }

  getSelectedPoints() {
    return this.points.filter(point => point.selected);
  }
}

export class AutomationEngine {
  constructor() {
    this.lanes = new Map();
    this.groups = new Map();
    this.isRecording = false;
    this.recordingLanes = new Set();
    this.playbackPosition = 0;
    this.recordingStartTime = 0;
    this.quantizeEnabled = false;
    this.quantizeValue = 0.1; // 100ms
    this.listeners = new Set();
    
    // Undo/Redo system
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;
  }

  // Lane management
  addLane(parameterId, parameterName, minValue = 0, maxValue = 1, defaultValue = 0.5) {
    const lane = new AutomationLane(parameterId, parameterName, minValue, maxValue, defaultValue);
    this.lanes.set(parameterId, lane);
    this.notifyListeners('laneAdded', { lane });
    return lane;
  }

  removeLane(parameterId) {
    const lane = this.lanes.get(parameterId);
    if (lane) {
      this.lanes.delete(parameterId);
      this.notifyListeners('laneRemoved', { parameterId, lane });
      return true;
    }
    return false;
  }

  getLane(parameterId) {
    return this.lanes.get(parameterId);
  }

  getAllLanes() {
    return Array.from(this.lanes.values());
  }

  // Parameter automation
  setParameterValue(parameterId, time, value, curveType = 'linear', tension = 0) {
    const lane = this.lanes.get(parameterId);
    if (!lane || lane.locked) return false;

    time = this.quantizeTime(time);
    const normalizedValue = lane.normalizeValue(value);
    
    // Check if point exists at this time
    const existingPoint = lane.points.find(p => Math.abs(p.time - time) < 0.001);
    
    if (existingPoint) {
      this.saveState();
      existingPoint.value = normalizedValue;
      existingPoint.curveType = curveType;
      existingPoint.tension = tension;
    } else {
      this.saveState();
      const point = new AutomationPoint(time, normalizedValue, curveType, tension);
      lane.addPoint(point);
    }

    this.notifyListeners('automationChanged', { parameterId, time, value });
    return true;
  }

  getParameterValue(parameterId, time) {
    const lane = this.lanes.get(parameterId);
    return lane ? lane.getValueAtTime(time) : null;
  }

  // Recording
  startRecording(parameterIds = null) {
    this.isRecording = true;
    this.recordingStartTime = performance.now();
    
    if (parameterIds) {
      this.recordingLanes.clear();
      parameterIds.forEach(id => this.recordingLanes.add(id));
    } else {
      // Record all enabled lanes
      this.recordingLanes.clear();
      this.lanes.forEach((lane, id) => {
        if (lane.enabled && !lane.locked) {
          this.recordingLanes.add(id);
        }
      });
    }

    this.notifyListeners('recordingStarted', { parameterIds });
  }

  stopRecording() {
    this.isRecording = false;
    this.recordingLanes.clear();
    this.notifyListeners('recordingStopped');
  }

  recordParameterChange(parameterId, value) {
    if (!this.isRecording || !this.recordingLanes.has(parameterId)) return false;

    const time = this.playbackPosition;
    return this.setParameterValue(parameterId, time, value);
  }

  // Playback
  setPlaybackPosition(time) {
    this.playbackPosition = time;
    this.notifyListeners('playbackPositionChanged', { time });
  }

  // Quantization
  quantizeTime(time) {
    if (!this.quantizeEnabled) return time;
    return Math.round(time / this.quantizeValue) * this.quantizeValue;
  }

  setQuantize(enabled, value = 0.1) {
    this.quantizeEnabled = enabled;
    this.quantizeValue = value;
  }

  // Groups
  createGroup(name, parameterIds) {
    const groupId = 'group_' + Math.random().toString(36).substr(2, 9);
    this.groups.set(groupId, { name, parameterIds: new Set(parameterIds) });
    
    // Assign group to lanes
    parameterIds.forEach(id => {
      const lane = this.lanes.get(id);
      if (lane) lane.group = groupId;
    });

    this.notifyListeners('groupCreated', { groupId, name, parameterIds });
    return groupId;
  }

  removeGroup(groupId) {
    const group = this.groups.get(groupId);
    if (group) {
      // Remove group from lanes
      group.parameterIds.forEach(id => {
        const lane = this.lanes.get(id);
        if (lane) lane.group = null;
      });
      
      this.groups.delete(groupId);
      this.notifyListeners('groupRemoved', { groupId });
      return true;
    }
    return false;
  }

  // Undo/Redo
  saveState() {
    const state = {
      lanes: new Map(),
      timestamp: Date.now()
    };

    this.lanes.forEach((lane, id) => {
      state.lanes.set(id, {
        points: lane.points.map(p => p.clone()),
        enabled: lane.enabled,
        visible: lane.visible,
        locked: lane.locked
      });
    });

    this.undoStack.push(state);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0; // Clear redo stack
  }

  undo() {
    if (this.undoStack.length === 0) return false;

    const currentState = {
      lanes: new Map(),
      timestamp: Date.now()
    };

    this.lanes.forEach((lane, id) => {
      currentState.lanes.set(id, {
        points: lane.points.map(p => p.clone()),
        enabled: lane.enabled,
        visible: lane.visible,
        locked: lane.locked
      });
    });

    this.redoStack.push(currentState);

    const previousState = this.undoStack.pop();
    this.restoreState(previousState);
    this.notifyListeners('undoPerformed');
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;

    const currentState = {
      lanes: new Map(),
      timestamp: Date.now()
    };

    this.lanes.forEach((lane, id) => {
      currentState.lanes.set(id, {
        points: lane.points.map(p => p.clone()),
        enabled: lane.enabled,
        visible: lane.visible,
        locked: lane.locked
      });
    });

    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop();
    this.restoreState(nextState);
    this.notifyListeners('redoPerformed');
    return true;
  }

  restoreState(state) {
    state.lanes.forEach((laneState, id) => {
      const lane = this.lanes.get(id);
      if (lane) {
        lane.points = laneState.points;
        lane.enabled = laneState.enabled;
        lane.visible = laneState.visible;
        lane.locked = laneState.locked;
      }
    });
  }

  // Event system
  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Automation listener error:', error);
      }
    });
  }

  // Utility methods
  clearAllAutomation() {
    this.saveState();
    this.lanes.forEach(lane => {
      lane.points = [new AutomationPoint(0, lane.normalizeValue(lane.defaultValue))];
    });
    this.notifyListeners('automationCleared');
  }

  exportAutomation() {
    const data = {
      version: '1.0',
      lanes: [],
      groups: []
    };

    this.lanes.forEach((lane, id) => {
      data.lanes.push({
        id: id,
        name: lane.name,
        minValue: lane.minValue,
        maxValue: lane.maxValue,
        defaultValue: lane.defaultValue,
        points: lane.points.map(p => ({
          time: p.time,
          value: p.value,
          curveType: p.curveType,
          tension: p.tension
        })),
        enabled: lane.enabled,
        visible: lane.visible,
        locked: lane.locked,
        color: lane.color
      });
    });

    this.groups.forEach((group, id) => {
      data.groups.push({
        id: id,
        name: group.name,
        parameterIds: Array.from(group.parameterIds)
      });
    });

    return data;
  }

  importAutomation(data) {
    this.saveState();
    
    try {
      // Clear existing data
      this.lanes.clear();
      this.groups.clear();

      // Import lanes
      data.lanes.forEach(laneData => {
        const lane = new AutomationLane(
          laneData.id,
          laneData.name,
          laneData.minValue,
          laneData.maxValue,
          laneData.defaultValue
        );

        lane.points = laneData.points.map(pointData => 
          new AutomationPoint(
            pointData.time,
            pointData.value,
            pointData.curveType,
            pointData.tension
          )
        );

        lane.enabled = laneData.enabled;
        lane.visible = laneData.visible;
        lane.locked = laneData.locked;
        lane.color = laneData.color;

        this.lanes.set(laneData.id, lane);
      });

      // Import groups
      data.groups.forEach(groupData => {
        this.groups.set(groupData.id, {
          name: groupData.name,
          parameterIds: new Set(groupData.parameterIds)
        });

        // Assign group to lanes
        groupData.parameterIds.forEach(id => {
          const lane = this.lanes.get(id);
          if (lane) lane.group = groupData.id;
        });
      });

      this.notifyListeners('automationImported');
      return true;
    } catch (error) {
      console.error('Failed to import automation:', error);
      return false;
    }
  }
}

// Global automation engine instance
export const automationEngine = new AutomationEngine();
