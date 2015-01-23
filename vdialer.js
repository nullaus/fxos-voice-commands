// XXXAus: This entire file will get refactored so that it's better structured.
//         We would like to make it as easy as possible to add handling of
//         new commands.

/**
 * The Voice Commands Interface
 */
var VoiceCommandsInterface = {
  // Elements we care about.
  speakButton: document.getElementById('speak'),
  audioElement: document.getElementById('say'),

  // State.
  interpretingCommand: false,

  /**
   * Initialize
   */
  init: function() {
    this.registerActivityHandler();
  },

  /**
   * Register our Activity Handler.
   */
  registerActivityHandler: function() {
    // Super basic handling for now.
    navigator.mozSetMessageHandler('activity', (function(activityRequest) {
      this.speakButton.onclick();
    }.bind(this)));
  },

  say: function(aSentence) {

  },
};

var speakbtn = document.querySelector("#speak");
var sayaudio = document.querySelector("#say");
var recognizing = false;

document.querySelector("#listening").style.display = 'none';
//document.querySelector("#lblstatus").style.display = 'none';


var speechrecognitionlist = new SpeechGrammarList();
speechrecognitionlist.addFromString  ( "#JSGF V1.0; grammar test; public <simple> =  please call my wife  | firefox what is the weather today|  how many messages i have | please text josh and say i am late  | firefox check my battery ; ", 1 );     
var recognition = new SpeechRecognition();     

console.log("speakbtn");

speakbtn.onclick = function () 
{ 
  recognizing = true;
  say("How can I help you?"); 
}  


function onendspeak() 
{
    if (!recognizing) 
    {
        return;
    }
    changelabel("Listening...");              
    document.querySelector("#fox").style.display = 'none';
    document.querySelector("#listening").style.display = 'block';
    document.querySelector("#lblstatus").style.display = 'block';

    document.querySelector("#weather").style.display = 'none';
    document.querySelector("#messages").style.display = 'none';
    document.querySelector("#tel").style.display = 'none';
    document.querySelector("#fox").style.display = 'none';
    document.querySelector("#text").style.display = 'none';            
    document.querySelector("#battery").style.display = 'none'; 

    console.log('starting')
    recognition.start();
    recognition.onresult = function(event) 
    {
          recognizing = false;
          document.querySelector("#listening").style.display = 'none';
          
          var interim_transcript = '';
          var score = '';

          // Assemble the transcript from the array of results
          for (var i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                  console.log("recognition.onresult : isFinal");                                
                  final_transcript += event.results[i][0].transcript;
              } else {
                  console.log("recognition.onresult : not isFinal");                                                                
                  interim_transcript += event.results[i][0].transcript;
                  score = event.results[i][0].confidence;
              }
          }

          changelabel(interim_transcript);
          console.log("interim_transcript");


          if (interim_transcript.indexOf('weather') > -1)
          {
            say("Today it is 75 degrees and sunny in Mountain View");
            document.querySelector("#weather").style.display = 'none';
            document.querySelector("#messages").style.display = 'none';
            document.querySelector("#tel").style.display = 'none';
            document.querySelector("#fox").style.display = 'none';
            document.querySelector("#text").style.display = 'none';            
            document.querySelector("#battery").style.display = 'none';                        

            document.querySelector("#weather").style.display = 'block'; 

          }

         if (interim_transcript.indexOf('messages') > -1)
          {
            say("You have 3 texts and 20 unread emails."); 
            document.querySelector("#weather").style.display = 'none';
            document.querySelector("#messages").style.display = 'none';
            document.querySelector("#tel").style.display = 'none';
            document.querySelector("#fox").style.display = 'none';
            document.querySelector("#text").style.display = 'none';            
            document.querySelector("#battery").style.display = 'none';                        

            document.querySelector("#messages").style.display = 'block'; 

          }

         if (interim_transcript.indexOf('text') > -1)
          {
            say("Ok. I am texting Josh saying you are late"); 
            document.querySelector("#weather").style.display = 'none';
            document.querySelector("#messages").style.display = 'none';
            document.querySelector("#tel").style.display = 'none';
            document.querySelector("#fox").style.display = 'none';
            document.querySelector("#text").style.display = 'none';            
            document.querySelector("#battery").style.display = 'none';                        

            document.querySelector("#text").style.display = 'block';            

          }   

         if (interim_transcript.indexOf('battery') > -1)
          {
            say("I still have 75 percent of battery remaining."); 
            document.querySelector("#weather").style.display = 'none';
            document.querySelector("#messages").style.display = 'none';
            document.querySelector("#tel").style.display = 'none';
            document.querySelector("#fox").style.display = 'none';
            document.querySelector("#text").style.display = 'none';            
            document.querySelector("#battery").style.display = 'none';                        

            document.querySelector("#battery").style.display = 'block'; 

          }          

          if (interim_transcript.indexOf('call') > -1)
          {
            say("Ok. I am calling Samanta.")

            document.querySelector("#weather").style.display = 'none';
            document.querySelector("#messages").style.display = 'none';
            document.querySelector("#tel").style.display = 'none';
            document.querySelector("#fox").style.display = 'none';
            document.querySelector("#text").style.display = 'none';            
            document.querySelector("#battery").style.display = 'none';                        

            document.querySelector("#tel").style.display = 'block'; 

            setTimeout(function(){      

                searchcontact("Samanta");
            
             }, 5000);   


          }
    };
}

function say(phrase)
{
    changelabel(phrase);
    urlaudio = "http://speechan.cloudapp.net/weblayer/synth.ashx?lng=en&msg=" + phrase;
 //   sayaudio.setAttribute("src","http://speechan.cloudapp.net/weblayer/synth.ashx?lng=en&msg=" + phrase); 

    setTimeout(function(){      

   var e = document.createElement("audio");
    e.src = urlaudio;
    e.setAttribute("autoplay", "true");
    //e.currentTime = 0;
    e.addEventListener("ended", onendspeak);


     }, 500);

 

}


function searchcontact(name)
{
      var allContacts = navigator.mozContacts.getAll({sortBy: "familyName", sortOrder: "descending"});
      allContacts.onsuccess = function(event) {
        var cursor = event.target;
        if (cursor.result) {
          console.log("Found from all contacts: " + cursor.result.name[0]  + " tel: " + cursor.result.tel[0].value );

          if (cursor.result.name[0].toLowerCase() == name)
          {
            console.log("achou " + cursor.result.name[0].toLowerCase() + " " + cursor.result.tel[0].value );
            call(cursor.result.tel[0].value);
          }
          cursor.continue();
        } else {
          console.log("No more contacts");
        }
      };

      allContacts.onerror = function() {
        console.warn("Something went terribly wrong! :(");
      };

}



function call(number)
{
      // Telephony object
    var tel = navigator.mozTelephony;
    // Place a call
    var telCall = tel.dial(number);  
    telCall.onactive = function(e) {
        changelabel("");          
        window.console.log('Connected!');
    }
    telCall.ondisconnected = function(e) {
        changelabel("");          
        window.console.log('Disconnected!');
        // update call history
    }
    telCall.onerror = function(e) {
        changelabel("");          
        window.console.error(e);
    }
}

function changelabel(str){
  document.querySelector("#lblstatus").style.display = 'block';  
  document.querySelector("#lblstatus").innerHTML = str;
}

navigator.mozSetMessageHandler('activity', (function(activityRequest) {
  this.speakButton.onclick();
}.bind(this)));
