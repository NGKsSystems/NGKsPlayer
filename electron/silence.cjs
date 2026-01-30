const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static')
ffmpeg.setFfmpegPath(ffmpegPath)

const NULL_SINK = process.platform === 'win32' ? 'NUL' : '/dev/null'

async function analyzeSilence(filePath, duration){
  return new Promise((resolve) => {
    let startCut = 0, endCut = 0
    let lastSilenceEnd = 0
    ffmpeg(filePath)
      .audioFilters('silencedetect=noise=-35dB:d=0.3')
      .outputOptions(['-f','null','-'])
      .on('stderr', line => {
        const m2 = /silence_end: ([0-9\.]+) \| silence_duration: ([0-9\.]+)/.exec(line)
        if (m2){
          const end = parseFloat(m2[1])
          const dur = parseFloat(m2[2])
          lastSilenceEnd = end
          if (dur > 0.25 && startCut === 0 && end < 3) startCut = end
        }
      })
      .on('end', () => {
        if (duration && lastSilenceEnd > duration - 6) {
          endCut = Math.max(0, duration - lastSilenceEnd)
        }
        resolve({ startCut, endCut })
      })
      .on('error', () => resolve({ startCut: 0, endCut: 0 }))
      .save(NULL_SINK)
  })
}

module.exports = { analyzeSilence }
