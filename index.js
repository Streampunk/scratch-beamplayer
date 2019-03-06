const fs = require('fs');
const portAudio = require('naudiodon');
const p2re = require('path-to-regexp');
const got = require('got');

const converter = p2re.compile(':name');
const convertToPathPart = n => converter({ name: n });

// Create an instance of AudioIO with outOptions, which will return a WritableStream
var ao = new portAudio.AudioIO({
  outOptions: {
    channelCount: 2,
    sampleFormat: portAudio.SampleFormat16Bit,
    sampleRate: 48000,
    deviceId: -1 // Use -1 or omit the deviceId to select the default device
  }
});

async function run() {
  let location = 'file:../media/sound/BBCNewsCountdown.wav';
  let locPathPart = convertToPathPart(location);

  let start = await got(
    `http://localhost:3000/beams/${locPathPart}/stream_0/start`,
    { json: true })

  let more = true;
  let pkt = start.body;
  pts = start.body.pts;
  while (more) {
    // console.log(pkt);
    pts += pkt.duration;
    let res = await got(
      `http://localhost:3000/beams/${locPathPart}/stream_0/packet_${pts}`,
      { json: true }
    ).catch(err => { more = false; });
    if (more === false) break;
    pkt = res.body;
    res = await got(
      `http://localhost:3000/beams/${locPathPart}/stream_0/packet_${pts}/data`,
      { responseType: 'buffer', encoding: null }
    );
    await new Promise((resolve, reject) => {
      if (ao.write(res.body.slice(0, 4096))) {
        resolve();
      } else {
        ao.once('drain', resolve);
      }
    });
  }
  ao.end();
}

run();
ao.start();
