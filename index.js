// Dependencies
const express = require("express");
const axios = require("axios");
const request = require("request");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const bodyParser = require("body-parser");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM_NUMBER;
const client = twilio(accountSid, authToken);

app.post("/whatsapp", async (req, res) => {
  const mediaUrl = req.body.MediaUrl0;
  const senderId = req.body.From.split("+")[1];

  if (mediaUrl) {
    await handleImageMessage(mediaUrl, senderId);
  } else {
    await handleTextMessage(senderId);
  }
  res.end();
});

async function handleImageMessage(mediaUrl, senderId) {
  try {
    await sendMessage(
      "شكرًا لإرسالك الرسالة. سيستغرق الأمر حوالي دقيقة لترجمة وتلخيص الرسالة. نشكرك على صبرك",
      senderId
    );

    const tempImageName = "temp_image.jpg";
    const fullPath = path.join(__dirname, tempImageName);
    await downloadImage(mediaUrl, tempImageName);
    const responseData = await processImage(fullPath);

    await sendMessage(responseData, senderId);
  } catch (error) {
    console.error("Error handling image message:", error);
  }
}

async function handleTextMessage(senderId) {
  try {
    await sendMessage(
      "Please send an image of a document you want me to translate.",
      senderId
    );
    console.log("WhatsApp reply sent");
  } catch (error) {
    console.error("Error handling text message:", error);
  }
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    request({
      url: url,
      auth: { username: accountSid, password: authToken },
    })
      .pipe(fs.createWriteStream(dest))
      .on("finish", resolve)
      .on("error", reject);
  });
}



async function processImage(filePath) {
  const data = new FormData();
  data.append("document", fs.createReadStream(filePath));
  data.append("language", "arabic");

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "http://localhost:3001/processDocument",
    headers: { ...data.getHeaders() },
    data: data,
  };

  const response = await axios.request(config);
  return JSON.stringify(response.data).replace(/\\n/g, "\n");
}

function sendMessage(body, senderId) {
  return client.messages.create({
    body: body,
    from: `whatsapp:${from}`,
    to: `whatsapp:+${senderId}`,
  });
}

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// // Handle incoming WhatsApp messages
// app.post("/whatsapp", (req, res) => {
//   const mediaUrl = req.body.MediaUrl0;
//   const senderId = req.body.From.split("+")[1];

//   // Twilio credentials
//   const accountSid = process.env.TWILIO_ACCOUNT_SID;
//   const authToken = process.env.TWILIO_AUTH_TOKEN;
//   const from = process.env.TWILIO_FROM_NUMBER;

//   // Initialise Twilio client
//   const client = twilio(accountSid, authToken);

//   // Check if the incoming message contains media (image)
//   if (mediaUrl) {
//     // Respond with a message indicating that an image was received
//     client.messages
//       .create({
//         body: "شكرًا لإرسالك الرسالة. سيستغرق الأمر حوالي دقيقة لترجمة وتلخيص الرسالة. نشكرك على صبرك",
//         from: `whatsapp:${from}`,
//         to: `whatsapp:+${senderId}`,
//       })
//       .then(async (message) => {
//         const tempImageName = "temp_image.jpg";
//         const fullPath = path.join(__dirname, tempImageName);

//         request({
//           url: mediaUrl,
//           auth: {
//             username: accountSid,
//             password: authToken,
//           },
//         })
//           .pipe(fs.createWriteStream(tempImageName))
//           .on("finish", async () => {
//             const data = new FormData();
//             data.append("document", fs.createReadStream(fullPath));
//             data.append("language", "arabic");

//             let config = {
//               method: "post",
//               maxBodyLength: Infinity,
//               url: "http://localhost:3001/processDocument",
//               headers: {
//                 ...data.getHeaders(),
//               },
//               data: data,
//             };

//             const response = await axios.request(config);

//             client.messages.create({
//               body: JSON.stringify(response.data).replace(/\\n/g, "\n"),
//               from: `whatsapp:${from}`,
//               to: `whatsapp:+${senderId}`,
//             });
//           });
//       })
//       .catch((error) => {
//         console.error("Error sending WhatsApp reply:", error);
//       });
//   } else {
//     client.messages
//       .create({
//         body: "This is the reply to the matched keyword.",
//         from: `whatsapp:${from}`,
//         to: `whatsapp:+${senderId}`,
//       })
//       .then((message) => {
//         console.log("WhatsApp reply sent:", message.sid);
//       })
//       .catch((error) => {
//         console.error("Error sending WhatsApp reply:", error);
//       });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server is listening on port ${port}`);
// });
