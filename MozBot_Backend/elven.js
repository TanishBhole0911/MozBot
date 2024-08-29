import { ElevenLabsClient, play } from "elevenlabs";
import { writeFile } from "fs/promises";
import { exec } from "child_process";
const elevenLabsApiKey = "sk_a75dab2604c90479a17f8649e605c468d2477a6ba5a8f7fd";
const voiceID = "Amit Gupta";

const elevenlabs = new ElevenLabsClient({
  apiKey: elevenLabsApiKey,
});
console.log(elevenlabs);

const inputData = [
  {
    text: "Hey there.I'm the chatbot that never needs coffee breaks, never calls in sick, ",
    facialExpression: "smile",
    animation: "ShakeHands",
  },
  {
    text: "And never, ever judges your weird search history.I'm basically a digital superhero—minus the cape and the tragic backstory. Ready to chat and conquer the virtual world together? Or at least figure out what to order for lunch?",
    facialExpression: "smile",
    animation: "Talking",
  },
  {
    text: "Let me tell you about some exciting signature events hosted by Mozilla. The biggest one is Hacktoberfest! It's all about contributing to open-source projects. Don't worry if you're new—your peers are here to guide you through the process, from setting up repositories to making your first pull request. It's a fantastic way to learn, collaborate, and earn some cool swag!",
    facialExpression: "smile",
    animation: "Talking2",
  },
  {
    text: "Next up, we have War for Treasure! This event is a quiz with a twist: you'll solve image-based puzzles and guess the technology being represented. Finally, we have Code vs AI—a thrilling code battle where you face off against AI in a test of wits and coding skills! May the best coder win!",
    facialExpression: "smile",
    animation: "Talking2",
  },
];

async function generateAndSaveAudio(text, index) {
  const fileName = `audios/Intro_${index}.mp3`;
  console.log(text);
  try {
    const audio = await elevenlabs.generate({
      voice: voiceID,
      text: text,
      model_id: "eleven_multilingual_v2",
    });

    await writeFile(fileName, audio);
    console.log(`Audio file ${fileName} successfully saved!`);
  } catch (error) {
    console.error(`Error generating audio for Intro_${index}:`, error);
  }
}

async function processAllInputs() {
  for (let i = 0; i < inputData.length; i++) {
    await generateAndSaveAudio(inputData[i].text, i);
  }
}

processAllInputs();

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (prefix, index) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for ${prefix}_${index}`);
  await execCommand(
    `ffmpeg -y -i audios\\${prefix}_${index}.mp3 audios\\${prefix}_${index}.wav`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `bin\\rhubarb -f json -o audios\\${prefix}_${index}.json audios\\${prefix}_${index}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

// Intro messages ke liye lip sync generate karne ka code
for (let i = 0; i <= 3; i++) {
  await lipSyncMessage("Intro", i);
}
