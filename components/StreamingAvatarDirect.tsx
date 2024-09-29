import { AVATARS, VOICES } from "@/app/lib/constants";
import {
  Configuration,
  NewSessionData,
  StreamingAvatarApi,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Tooltip,
} from "@nextui-org/react";
import { Microphone, MicrophoneStage } from "@phosphor-icons/react";
import { useChat } from "ai/react";
import clsx from "clsx";
import OpenAI from "openai";
import { useEffect, useRef, useState } from "react";
import StreamingAvatarTextInput from "./StreamingAvatarTextInput";

const conversationId = "pQaxpHOMGwGKDsZwRiOP"; // Hardcoded conversation ID
const tokenId = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJWaXNpdG9yIiwiYXV0aENsYXNzSWQiOiIyNzEzNDE2MC0wOTQ3LTQzYTYtYmMzNi1mMGUxNThhZmU0MDciLCJwcmltYXJ5QXV0aENsYXNzSWQiOm51bGwsImNoYW5uZWwiOiJDSEFUX1dJREdFVCIsInNvdXJjZSI6IkNIQVRfV0lER0VUX1ZJU0lUT1IiLCJzb3VyY2VJZCI6Ik5BIiwiaWF0IjoxNzI2OTgzODgyLjM3OCwiZXhwIjoxNzQyNTM1ODgyLjM3OH0.dTEPsrowPAuRO-m3YSlMlF78lsjgadSte0RIorni2iJJ4pIUQ55NHlRch1p3qK4IqhK06VBpe8y09dF9EIwuNCN5MNH8Vieo9APmgXdisWeFwX_gYb-g_8UPTkeXcY4YYNxb9vTQ9KyuJ9Q_Dj0kb3xIzRiy-lBgf43oTLscnFlTrU5aaNajMtEUGlcYAVaxdItu40xKz0HhaGByS2LMq7Eucbs6vXfH0jHRU0A1N1q3j1SMqns-KmVZoEYUfe8x-8t0tnLZ5xPQ35huI63Y8wo8u2Yz1DEz47bnuzby_U4A1S4UmD5PqutvHppdMZKxuiGpBBA0yI8d7ybzxW5htA2DN7fURlF2FhkDClwT1mUY05v4oTyiho-JRZ_FC9l_9Dr6yBEhauvnb0PpWJfjqnbHnaZ9WjyLqgK4xZst3Dhr_fbYdS980ABxWda4G3i_sZYSjflAZPs0LeYkH-EuIILkqmIG4QjET5Mymy-jZSSAlsPA9UdFJF6qkF1t_-hvwicmh3kM55NCrydX9-1MzYC_lJIzsRAVXAGh2OASwBKEp6nhciIcjV0hc4IA0F7fiLDygekj6mijN6tBi478FXEiPZ8E2-_JNQy0zcf5J8lIUwTrioxLLzcPRBfjMK-Gw5Bmdj1qC_X_rIbaOqTxI3tbeWQ4iGSxkCIMkvnRy7I"; // Hardcoded token ID


const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function StreamingAvatar() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [data, setData] = useState<NewSessionData>();
  const [text, setText] = useState<string>("");
  const [initialized, setInitialized] = useState(false); // Track initialization
  const [recording, setRecording] = useState(false); // Track recording state
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatarApi | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const { input, setInput, handleSubmit } = useChat({
    onFinish: async (message) => {
      console.log("ChatGPT Response:", message);

      if (!initialized || !avatar.current) {
        setDebug("Avatar API not initialized");
        return;
      }

      //send the ChatGPT response to the Streaming Avatar
      await avatar.current
        .speak({
          taskRequest: { text: message.content, sessionId: data?.sessionId },
        })
        .catch((e) => {
          setDebug(e.message);
        });
      setIsLoadingChat(false);
    },
    initialMessages: [
      {
        id: "1",
        role: "system",
        content: "You are a helpful assistant.",
      },
    ],
  });

  const [avatarId, setAvatarId] = useState<string>("josh_lite3_20230714");
  const [voiceId, setVoiceId] = useState<string>("077ab11b14f04ce0b49b5f6e5cc20979");
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      console.log("Access Token:", token); // Log the token to verify
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return "";
    }
  }

  async function startSession() {
    setIsLoadingSession(true);
    await updateToken();
    if (!avatar.current) {
      setDebug("Avatar API is not initialized");
      return;
    }
    try {
      const res = await avatar.current.createStartAvatar(
        {
          newSessionRequest: {
            quality: "low",
            avatarName: avatarId,
            voice: { voiceId: voiceId },
          },
        },
        setDebug
      );
      setData(res);
      setStream(avatar.current.mediaStream);
      setSessionStarted(true); // Set session started after successful session start
      setShowWelcome(false);  // Hide the "Welcome!" text when session starts
    } catch (error) {
      console.error("Error starting avatar session:", error);
      setDebug(
        `There was an error starting the session. ${
          voiceId ? "This custom voice ID may not be supported." : ""
        }`
      );
    }
    setIsLoadingSession(false);
  }

  async function updateToken() {
    const newToken = await fetchAccessToken();
    console.log("Updating Access Token:", newToken); // Log token for debugging
    avatar.current = new StreamingAvatarApi(
      new Configuration({ accessToken: newToken })
    );

    const startTalkCallback = (e: any) => {
      console.log("Avatar started talking", e);
    };

    const stopTalkCallback = (e: any) => {
      console.log("Avatar stopped talking", e);
    };

    console.log("Adding event handlers:", avatar.current);
    avatar.current.addEventHandler("avatar_start_talking", startTalkCallback);
    avatar.current.addEventHandler("avatar_stop_talking", stopTalkCallback);

    setInitialized(true);
  }

  async function handleInterrupt() {
    if (!initialized || !avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current
      .interrupt({ interruptRequest: { sessionId: data?.sessionId } })
      .catch((e) => {
        setDebug(e.message);
      });
  }

  async function endSession() {
    if (!initialized || !avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.stopAvatar(
      { stopSessionRequest: { sessionId: data?.sessionId } },
      setDebug
    );
    setStream(undefined);
    setSessionStarted(false); // Reset session started state
  }

  async function checkMessage(){

    setIsLoadingRepeat(true);
    if (!initialized || !avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }

    let newText = "";
    const url = new URL("https://services.leadconnectorhq.com/conversations/providers/live-chat/messages/search");
    const params = {
      conversationId: conversationId,
      locationId: "iXTyVwO6W2aVQLa0g3Ow",
      lastMessageId: "",
      pageLimit: 10,
    };
  
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  
    const headers = {
      "Authorization": `Bearer ${tokenId}`,
      "Content-Type": "application/json",
    };
  
    try {
      const response = await fetch(url, { method: 'GET', headers: headers });
  
      if (response.status === 429) {
        console.warn('Too many requests. Backing off...');
        await new Promise(resolve => setTimeout(resolve, 60000)); // wait for 60 seconds
        return; // Exit the function to avoid further processing
      }
    ///+
    const data = await response.json();
    const messages = data.messages;

    // Retrieve the last fetched messages from localStorage
    // const storedMessages = JSON.parse(localStorage.getItem('messages')) || "";
    const storedMessages: string = JSON.parse(localStorage.getItem('messages') as string) || "";
    console.log("--last-message--");
    console.log(storedMessages);
    console.log("---");
    

    // Find new outbound messages
    const newOutboundMessages = messages.filter(newMsg => 
      newMsg.direction === "outbound" &&
      !storedMessages.some(storedMsg => storedMsg.id === newMsg.id)
    );

    let newMessage = "";

    // Display new outbound messages
    if (newOutboundMessages.length > 0) {
        newMessage = newOutboundMessages.map(msg => msg.body).join('\n');
    } else {
        newMessage = '';
    }


    console.log("leadConnector Response:", newMessage);
    newText = newMessage;

    // Save the current messages to localStorage
    localStorage.setItem('messages', JSON.stringify(messages));
    localStorage.setItem('conversationId', conversationId);
    localStorage.setItem('tokenId', tokenId);

    }
    
    
    catch (error) {
      console.error('Error fetching messages:', error);
    }

    if (newText === "") {
      console.log("No new outbound messages");
    } else {
        // console.log("Message is not empty");
        // Use the response as needed, for example, to speak through the avatar
        await avatar.current
        .speak({ taskRequest: { text: newText, sessionId: data?.sessionId } })
        .catch((e) => {
          setDebug(e.message);
        });
        setIsLoadingRepeat(false);
    }
  }

  async function handleSpeak() {

    // setIsLoadingRepeat(true);
    // if (!initialized || !avatar.current) {
    //   setDebug("Avatar API not initialized");
    //   return;
    // }

    checkMessage();

    // const openai = new OpenAI({
    //   apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // Next.js requires you to prefix environment variables with NEXT_PUBLIC_ to make them accessible in the browser (client-side code).
    //   dangerouslyAllowBrowser: true,
    // });
  
  
    // const response = await openai.chat.completions.create({
    //   model: "gpt4o-mini",
    //   messages: [
    //     { role: "system", content: "You are an assistant." },
    //     { role: "user", content: text }
    //   ],
    //   temperature: 0.3,
    //   max_tokens: 4096,
    //   top_p: 0.9,
    //   frequency_penalty: 0.1,
    //   presence_penalty: 0.1
    // });

    // const rtn: string = response.choices[0].message.content as string;
    
    // // Log the response from OpenAI
    // console.log("OpenAI Response:", rtn);

    // // Check if response.choices[0].message.content is not null
    // if (response.choices[0]?.message?.content !== null) {
    //   const rtn: string = response.choices[0].message.content;
      
    //   // Log the response from OpenAI
    //   console.log("OpenAI Response:", rtn);


    ///

      
      // let newText = "";
      // const url = new URL("https://services.leadconnectorhq.com/conversations/providers/live-chat/messages/search");
      // const params = {
      //   conversationId: conversationId,
      //   locationId: "iXTyVwO6W2aVQLa0g3Ow",
      //   lastMessageId: "",
      //   pageLimit: 10,
      // };
    
      // Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
      // const headers = {
      //   "Authorization": `Bearer ${tokenId}`,
      //   "Content-Type": "application/json",
      // };
    
      // try {
      //   const response = await fetch(url, { method: 'GET', headers: headers });
    
      //   if (response.status === 429) {
      //     console.warn('Too many requests. Backing off...');
      //     await new Promise(resolve => setTimeout(resolve, 60000)); // wait for 60 seconds
      //     return; // Exit the function to avoid further processing
      //   }
      // ///+
      // const data = await response.json();
      // const messages = data.messages;
  
      // // Retrieve the last fetched messages from localStorage
      // // const storedMessages = JSON.parse(localStorage.getItem('messages')) || "";
      // const storedMessages: string = JSON.parse(localStorage.getItem('messages') as string) || "";
      // console.log("--last-message--");
      // console.log(storedMessages);
      // console.log("---");
      

      // // Find new outbound messages
      // const newOutboundMessages = messages.filter(newMsg => 
      //   newMsg.direction === "outbound" &&
      //   !storedMessages.some(storedMsg => storedMsg.id === newMsg.id)
      // );

      // let newMessage = "";

      // // Display new outbound messages
      // if (newOutboundMessages.length > 0) {
      //     newMessage = newOutboundMessages.map(msg => msg.body).join('\n');
      // } else {
      //     newMessage = '';
      // }


      // console.log("leadConnector Response:", newMessage);
      // newText = newMessage;

      // // Save the current messages to localStorage
      // localStorage.setItem('messages', JSON.stringify(messages));
      // localStorage.setItem('conversationId', conversationId);
      // localStorage.setItem('tokenId', tokenId);

      // }
      
      
      // catch (error) {
      //   console.error('Error fetching messages:', error);
      // }

      // if (newText === "") {
      //   console.log("No new outbound messages");
      // } else {
      //     // console.log("Message is not empty");
      //     // Use the response as needed, for example, to speak through the avatar
      //     await avatar.current
      //     .speak({ taskRequest: { text: newText, sessionId: data?.sessionId } })
      //     .catch((e) => {
      //       setDebug(e.message);
      //     });
      //     setIsLoadingRepeat(false);
      // }

      

      // // Use the response as needed, for example, to speak through the avatar
      // await avatar.current
      // .speak({ taskRequest: { text: newText, sessionId: data?.sessionId } })
      // .catch((e) => {
      //   setDebug(e.message);
      // });
      // setIsLoadingRepeat(false);

    // Log the text state when onSubmit is triggered
    console.log("Submitted text:", text);


    //send message here:

    try {

      const url = "https://services.leadconnectorhq.com/conversations/providers/live-chat/messages";
      const headers = {
          "Authorization": `Bearer ${tokenId}`,
          "Content-Type": "application/json"
      };
      const payload = {
          locationId: "iXTyVwO6W2aVQLa0g3Ow",
          message: text,
          type: "Live_Chat",
          chatWidgetId: "66d01cf3f0610d45aac281d0",
          conversationId: conversationId
      };

      fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(data => {
          console.log('Success:', data);
          // alert('Message sent successfully!');
          console.log("Messegae sent success!")
      })
      .catch(error => {
          console.error('Error:', error);
          // alert('Failed to send message.');
          console.log('Failed to send message.');
      });
      
    } catch (error) {
      console.log("Error occured during sending message. Please check your leadconnectorhq access!")
    }

  }

  // useEffect to call checkMessage every 30 seconds when the session starts
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (sessionStarted) {
      intervalId = setInterval(() => {
        checkMessage();
      }, 30000); // 30 seconds

      return () => {
        clearInterval(intervalId); // Clean up the interval if the component unmounts or session stops
      };
    }
  }, [sessionStarted]); // Depend on sessionStarted

  useEffect(() => {
    async function init() {
      const newToken = await fetchAccessToken();
      console.log("Initializing with Access Token:", newToken); // Log token for debugging
      avatar.current = new StreamingAvatarApi(
        new Configuration({ accessToken: newToken, jitterBuffer: 200 })
      );
      setInitialized(true); // Set initialized to true
    }
    init();

    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);
  
  function startRecording() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder.current = new MediaRecorder(stream);
        mediaRecorder.current.ondataavailable = (event) => {
          audioChunks.current.push(event.data);
        };
        mediaRecorder.current.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, {
            type: "audio/wav",
          });
          audioChunks.current = [];
          transcribeAudio(audioBlob);
        };
        mediaRecorder.current.start();
        setRecording(true);
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
      });
  }

  function stopRecording() {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  }

  async function transcribeAudio(audioBlob: Blob) {
    try {
      // Convert Blob to File
      const audioFile = new File([audioBlob], "recording.wav", {
        type: "audio/wav",
      });
      const response = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
      });
      const transcription = response.text;
      console.log("Transcription: ", transcription);
      setInput(transcription);
    } catch (error) {
      console.error("Error transcribing audio:", error);
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="h-[500px] flex flex-col justify-center items-center">
          {showWelcome && (
            <div className="absolute top-0 mt-4" style={{marginTop: '150px'}}>
              <h1 className="text-2xl font-bold">Welcome!</h1>
            </div>
          )}
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
              <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                <Button
                  size="md"
                  onClick={endSession}
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300  text-white rounded-lg"
                  variant="shadow"
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className={`h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center ${sessionStarted ? 'hidden' : ''}`}>
              <Button
                size="md"
                onClick={startSession}
                // className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                className="bg-green-500 w-full text-white"
                // className="bg-gradient-to-tr from-green-500 to-green-300 w-full text-white"
                variant="shadow"
              >
                Start with our Dynamic AI Chatbot!
              </Button>
            </div>
          ) : (
            <Spinner size="lg" color="default" />
          )}
        </CardBody>
        <Divider />
        <CardFooter className="flex flex-col gap-3">
          <StreamingAvatarTextInput
            label="User Prompt"
            placeholder="Type something"
            input={text}
            onSubmit={handleSpeak}
            setInput={(newText) => {
              // console.log("Typed text:", newText);  // Logging the text input
              setText(newText);  // Updating the state with the new text
            }}
            disabled={!stream}
            loading={isLoadingRepeat}
            // endContent={
            //   <Tooltip
            //     content={!recording ? "Start recording" : "Stop recording"}
            //   >
            //     <Button
            //       onClick={!recording ? startRecording : stopRecording}
            //       isDisabled={!stream}
            //       isIconOnly
            //       className={clsx(
            //         "mr-4 text-white",
            //         !recording
            //           ? "bg-gradient-to-tr from-indigo-500 to-indigo-300"
            //           : ""
            //       )}
            //       size="sm"
            //       variant="shadow"
            //     >
            //       {!recording ? (
            //         <Microphone size={20} />
            //       ) : (
            //         <>
            //           <div className="absolute h-full w-full bg-gradient-to-tr from-indigo-500 to-indigo-300 animate-pulse -z-10"></div>
            //           <MicrophoneStage size={20} />
            //         </>
            //       )}
            //     </Button>
            //   </Tooltip>
            // }
            // disabled={!stream}

          />
        </CardFooter>
      </Card>
      {/* <p className="font-mono text-right">
        <span className="font-bold">Console:</span>
        <br />
        {debug}
      </p> */}
    </div>
  );
}
