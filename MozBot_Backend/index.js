import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ElevenLabsClient } from "elevenlabs";
import { writeFile } from "fs/promises";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
console.log(elevenLabsApiKey);
const voiceID = "Sxk6njaoa7XLsAFT7WcN";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios\\message_${message}.mp3 audios\\message_${message}.wav`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `bin\\rhubarb -f json -o audios\\message_${message}.json audios\\message_${message}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

const elevenLabs = new ElevenLabsClient({
  apiKey: elevenLabsApiKey,
});

const introMessages = [
  {
    text: "Hey there.I'm the chatbot that never needs coffee breaks, never calls in sick, and never, ever judges your weird search history.",
    facialExpression: "smile",
    animation: "ShakeHands",
  },
  {
    text: " I'm basically a digital superhero—minus the cape and the tragic backstory. Ready to chat and conquer the virtual world together? Or at least figure out what to order for lunch?",
    facialExpression: "smile",
    animation: "Talking2",
  },
  {
    text: "Let me tell you about some exciting signature events hosted by Mozilla. The biggest one is Hacktoberfest! It's all about contributing to open-source projects. Don't worry if you're new—your peers are here to guide you through the process, from setting up repositories to making your first pull request. It's a fantastic way to learn, collaborate, and earn some cool swag!",
    facialExpression: "smile",
    animation: "Talking",
  },
  {
    text: "Next up, we have War for Treasure! This event is a quiz with a twist: you'll solve image-based puzzles and guess the technology being represented. Finally, we have Code vs AI—a thrilling code battle where you face off against AI in a test of wits and coding skills! May the best coder win!",
    facialExpression: "smile",
    animation: "Talking",
  },
];

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log(userMessage);
    if (!userMessage) {
      res.send({
        messages: await Promise.all(
          introMessages.map(async (msg, index) => ({
            text: msg.text,
            audio: await audioFileToBase64(`audios/Intro_${index}.wav`),
            lipsync: await readJsonTranscript(`audios/Intro_${index}.json`),
            facialExpression: msg.facialExpression,
            animation: msg.animation,
          }))
        ),
      });
      return;
    }

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI Chatbot created by Mozilla, and your name is Taniksh. Be prepared to respond in multiple languages.
          You should always reply with a JSON array of messages, with a maximum of 3 messages in each response.
          Each message must include three properties: text, facialExpression, and animation.
          The available facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
          The available animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry.
          
          User message: ${userMessage || "Hello"}`,
            },
          ],
        },
      ],
    });

    const response = await result.response;
    const text = response.text();
    let messages;
    try {
      messages = JSON.parse(text);
      if (!Array.isArray(messages)) {
        messages = messages.messages || [];
      }
    } catch (error) {
      console.error("JSON parsing error:", error);
      messages = [];
    }

    console.log("Parsed messages:", messages);
    console.log("Number of messages:", messages.length);
    console.log("First message text:", messages[0]?.text);

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const fileName = `audios/message_${i}.mp3`;
      const textInput = message.text;
      console.log(textInput);
      try {
        const audio = await elevenLabs.generate({
          voice: voiceID,
          text: textInput,
          model_id: "eleven_multilingual_v2",
        });

        await writeFile(fileName, audio);
        console.log(`Audio file ${fileName} successfully saved!`);

        await lipSyncMessage(i);
        message.audio = await audioFileToBase64(fileName);
        message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
      } catch (error) {
        console.error(`Error generating audio for message ${i}:`);
        // Handle error appropriately
      }
    }

    res.send({
      messages: await Promise.all(
        introMessages.map(async (msg, index) => ({
          text: msg.text,
          audio: await audioFileToBase64(`audios/Intro_${index}.wav`),
          lipsync: await readJsonTranscript(`audios/Intro_${index}.json`),
          facialExpression: msg.facialExpression,
          animation: msg.animation,
        }))
      ),
    });
  } catch (error) {
    console.error("Error in /chat endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`Virtual Girlfriend listening on port ${port}`);
});
