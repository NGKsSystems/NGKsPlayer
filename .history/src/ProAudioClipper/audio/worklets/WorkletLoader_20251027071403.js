/**
 * AudioWorklet Loader Utility
 * 
 * Handles loading of AudioWorklet modules with proper path resolution
 * and fallback support for browsers that don't support AudioWorklets.
 */

export class WorkletLoader {
  static async loadProfessionalAudioProcessor(audioContext) {
    try {
      // Try to load the worklet module
      const workletPath = new URL(
        '../worklets/ProfessionalAudioProcessorWorklet.js',
        import.meta.url
      ).href;
      
      await audioContext.audioWorklet.addModule(workletPath);
      
      // Create the worklet node
      const workletNode = new AudioWorkletNode(
        audioContext,
        'professional-audio-processor',
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 2,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers'
        }
      );
      
      return workletNode;
      
    } catch (error) {
      console.warn('Failed to load AudioWorklet:', error);
      throw error;
    }
  }
  
  static createFallbackProcessor(audioContext) {
    // Create a fallback using ScriptProcessorNode for older browsers
    const bufferSize = 4096; // Larger buffer for compatibility
    const scriptNode = audioContext.createScriptProcessor(bufferSize, 2, 2);
    
    // Basic passthrough processing
    scriptNode.onaudioprocess = (event) => {
      const inputL = event.inputBuffer.getChannelData(0);
      const inputR = event.inputBuffer.getChannelData(1);
      const outputL = event.outputBuffer.getChannelData(0);
      const outputR = event.outputBuffer.getChannelData(1);
      
      // Simple passthrough - in a real implementation,
      // this would include the effects processing
      for (let i = 0; i < bufferSize; i++) {
        outputL[i] = inputL[i];
        outputR[i] = inputR[i];
      }
    };
    
    // Add minimal API compatibility
    scriptNode.parameters = new Map();
    scriptNode.port = {
      postMessage: (data) => {
        console.log('Fallback processor message:', data);
      },
      onmessage: null
    };
    
    return scriptNode;
  }
  
  static async loadWithFallback(audioContext) {
    try {
      return await WorkletLoader.loadProfessionalAudioProcessor(audioContext);
    } catch (error) {
      console.warn('AudioWorklet not supported, using fallback processor');
      return WorkletLoader.createFallbackProcessor(audioContext);
    }
  }
}