require("dotenv").config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});

const express = require("express");
const path = require("path");
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const cors = require("cors");

const app = express();

app.use(express.json());

app.use("/files", express.static(path.join(__dirname, "public")));
app.use(cors());

app.post("/text-to-speech", (req, res) => {
  const { text, voice } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text and voice are required" });
  }

  var audioFile = Date.now() + ".wav";
  // This example requires environment variables named "SPEECH_KEY" and "SPEECH_REGION"
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.SPEECH_KEY,
    process.env.SPEECH_REGION
  );
  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(
    "public/" + audioFile
  );

  // The language of the voice that speaks.
  speechConfig.speechSynthesisVoiceName =
    voice || "en-US-AvaMultilingualNeural";

  // Create the speech synthesizer.
  var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  let visemes = [];

  synthesizer.visemeReceived = (s, e) => {
    visemes.push({
      value: e.visemeId,
      time: e.audioOffset / 10000,
    });
  };

  synthesizer.speakTextAsync(
    text,
    function (result) {
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      } else {
        console.error(
          "Speech synthesis canceled, " +
            result.errorDetails +
            "\nDid you set the speech resource key and region values?"
        );
      }
      synthesizer.close();
      synthesizer = null;

      // Simulate the conversion process
      const audioUrl = `${req.protocol}://${req.get(
        "host"
      )}/files/${audioFile}`;

      res.json({ audioUrl, visemes });
    },
    function (err) {
      console.trace("err - " + err);
      synthesizer.close();
      synthesizer = null;

      res.status(500).json({ error: "Failed to synthesize text" });
    }
  );
});

const port = process.env.PORT || 8888;

app.listen(port, () => {
  console.log("Server is running on port 8000");
});
