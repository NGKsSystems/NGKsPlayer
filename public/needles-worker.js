class Counter {
  constructor (targetCount, callback = function () {}, context = null) {
    this.targetCount = targetCount;
    this.callback = callback;
    this.context = context;
    this.count = 0;
  }

  increment (count) {
    this.count += count;

    if (this.count >= this.targetCount) {
      this.callback.call(this.context);
      this.count = this.count % this.targetCount;
    }
  }

  willMeetTarget (count) {
    return this.count + count >= this.targetCount
  }

  reset () {
    this.count = 0;
  }
}

class Bin {
  constructor (length) {
    this.length = length;
    this.array = new Float32Array(length);
    this.count = 0;
  }

  add (items) {
    const remainingCount = this.length - this.count;
    const itemsToAdd = items.slice(0, remainingCount);
    this.array.set(itemsToAdd, this.count);
    this.count += itemsToAdd.length;
  }

  get full () {
    return this.length === this.count
  }
}

class Block {
  constructor (options) {
    this.channelCount = options.channelCount;
    this.length = options.length;
    this.count = 0;
    this.full = false;
  }

  get bins () {
    if (this._bins) return this._bins

    this._bins = Array(this.channelCount).fill(null).map(() => this.createBin());
    return this._bins
  }

  add (channels) {
    this.bins.forEach((bin, i) => bin.add(channels[i]));
    this.full = (this.count += channels[0].length) > this.length;
  }

  dump () {
    return this.bins.map(bin => bin.array)
  }

  createBin () {
    return new Bin(this.length)
  }
}

function sum (numbers) {
  var sum = 0;
  for (var i = numbers.length - 1; i >= 0; i--) {
    sum += numbers[i];
  }
  return sum
}

function meanSquare (samples) {
  var sum = 0;
  for (var i = samples.length - 1; i >= 0; i--) {
    sum += Math.pow(samples[i], 2);
  }
  return sum / samples.length
}

function cumulativeMovingAverage ({ value, index, mean }) {
  return (value + (index * (mean || 0))) / (index + 1)
}

const GAINS = [1, 1, 1, 1.41, 1.41];

class LoudnessMeasurement {
  constructor (channels = []) {
    this.powers = channels.map(samples => meanSquare(samples));
  }

  weightedPowers (powers) {
    return (powers || this.powers).map((power, index) => power * GAINS[index])
  }

  loudness (powers) {
    return -0.691 + 10 * Math.log10(sum(this.weightedPowers(powers)))
  }
}

class LoudnessMeter {
  constructor (options) {
    this.name = options.name;
    this.delegate = options.delegate;
    this.sampleRate = options.sampleRate;
    this.blockDuration = options.blockDuration;
    this.blockMargin = options.blockMargin;
    this.updateDuration = options.updateDuration;
    this.blocks = [];
    this.fullBlocks = [];
  }

  get blockLengthInSamples () {
    return Math.round((this.blockDuration / 1000) * this.sampleRate)
  }

  get blockMarginLengthInSamples () {
    return Math.round((this.blockMargin / 1000) * this.sampleRate)
  }

  get updateLengthInSamples () {
    return Math.round((this.updateDuration / 1000) * this.sampleRate)
  }

  get blockMarginCounter () {
    return (
      this._blockMarginCounter = this._blockMarginCounter || new Counter(
        this.blockMarginLengthInSamples
      )
    )
  }

  get updateCounter () {
    return (
      this._updateCounter = this._updateCounter || new Counter(
        this.updateLengthInSamples,
        this.update,
        this
      )
    )
  }

  input (input) {
    this.channelCount = input.length;
    const sampleCount = input[0].length;

    if (!this.blocks.length || this.blockMarginCounter.willMeetTarget(sampleCount)) {
      this.blocks.push(this.createBlock());
    }

    this.blocks = this.blocks.filter((block) => {
      block.add(input);
      if (block.full) {
        this.fullBlocks.push(block);
        return false
      }
      return true
    });

    this.updateCounter.increment(sampleCount);
    this.blockMarginCounter.increment(sampleCount);
  }

  createBlock () {
    return new Block({
      channelCount: this.channelCount,
      length: this.blockLengthInSamples
    })
  }

  update () {
    const block = this.fullBlocks[0] ? this.fullBlocks.shift() : this.blocks[0];
    this.delegate.update(
      this.name,
      new LoudnessMeasurement(block.dump()).loudness()
    );
  }

  reset () {
    this.blocks = [];
    this.fullBlocks = [];
    this.blockMarginCounter.reset();
    this.updateCounter.reset();

    this.delegate.update(
      this.name,
      new LoudnessMeasurement(this.createBlock().dump()).loudness()
    );
  }
}
