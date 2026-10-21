import {Capacitor} from "@capacitor/core";
import {TextToSpeech} from "@capacitor-community/text-to-speech";
import {Camera,CameraResultType,CameraSource} from "@capacitor/camera";

const $=id=>document.getElementById(id);
$("platform").textContent="Platform: "+Capacitor.getPlatform()+
 " | native: "+Capacitor.isNativePlatform();
$("speak").onclick=()=>speak(1);
$("slow").onclick=()=>speak(0.8);
async function speak(rate){
 try{
  const text=$("word").value.trim();
  if(!text||text.length>80)throw Error("Enter a word up to 80 characters");
  await TextToSpeech.speak({text,lang:"en-US",rate,pitch:1,queueStrategy:0});
  $("result").textContent="TTS call accepted · rate "+rate;
 }catch(error){$("result").textContent="TTS failed: "+String(error);}
}
$("photo").onclick=async()=>{
 try{
  const file=await Camera.getPhoto({source:CameraSource.Photos,
   resultType:CameraResultType.Uri,quality:70});
  $("preview").src=file.webPath;
  $("preview").style.display="block";
  $("result").textContent="Photo selected (not uploaded)";
 }catch(error){$("result").textContent="Photo canceled / unavailable: "+String(error);}
};
