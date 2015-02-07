// XXXAus: This entire file will get refactored so that it's better structured.
//         We would like to make it as easy as possible to add handling of
//         new commands.

// Set to off when you're done using.
var DEBUG_LOGGING = true;

function debug(aMessage) {
  if (DEBUG_LOGGING) {
    console.log(aMessage)
  }
}

/**
 * The Voice Commands Interface
 */
var VoiceCommandsInterface = {
  // Elements we care about.
  speakButton: null,
  statusText: null,
  statusIcon: null,
  listeningAnimation: null,

  // Speech Recognition related things.
  speechRecognition: null,
  speechGrammarList: null,

  // State.
  _interpretingCommand: false,

  /**
   * Initialize
   */
  init: function() {
    debug('VoiceCommandsInterface::init');

    // Grammar list needs to happen first. Without a grammar list the speech
    // recognition object has nothing to initialize with.
    this.createGrammarList();
    this.createSpeechRecognition();

    this.speakButton = document.getElementById('microphone-button');
    this.speakButton.onclick = (function() {
      // XXXAus: Should load this via l10n.
      this.say('How may I help you?', true);
    }).bind(this);

    this.statusText = document.getElementById('status-text');
    this.statusIcon = document.getElementById('status-icon');
    this.listeningAnimation = document.getElementById('listening-animation');

    this.registerActivityHandler();
  },

  /**
   * Creates the speech recognition object and configures it.
   */
  createSpeechRecognition: function() {
    debug('VoiceCommandsInterface::createSpeechRecognition');

    // For now, no special configuration is needed.
    this.speechRecognition = new SpeechRecognition();
  },

  /**
   * Creates the grammar list used by the speech recognition object.
   */
  createGrammarList: function() {
    debug('VoiceCommandsInterface::createGrammarList');

    this.speechGrammarList = new SpeechGrammarList();

    // XXXAus: This should *not* be a giant blob. It should be split into more
    //         discrete elements, such as actions, qualifiers for actions and
    //         information related to the action.
    var grammar = '#JSGF v1.0; grammar fxosVoiceCommands; ' +
                  'public <simple> = ' +
                  'testing | ' +
                  'call me | ' +
                  'dial me | ' +
                  'check my messages | ' +
                  'text me | ' +
                  'send me a text to remind me to get milk | ' +
                  'whats my battery level | ' +
                  'open my calendar ;';

    this.speechGrammarList.addFromString(grammar, 1);
  },

  /**
   * Register our Activity Handler.
   */
  registerActivityHandler: function() {
    debug('VoiceCommandsInterface::registerActivityHandler');

    // Super basic handling for now.
    navigator.mozSetMessageHandler('activity', (function(activityRequest) {
      this.speakButton.click();
    }.bind(this)));
  },

  /**
   * Updates the status label using the text provided.
   *
   * @param aText The text to put in the status label.
   * @memberOf VoiceCommandsInterface
   */
  updateStatusText: function(aText) {
    this.statusText.style.display = 'block';
    this.statusText.innerHTML = aText;
  },

  /**
   * Update the status icon using the icon type provided.
   *
   * @param aIconType The type of the icon to use.
   * @memberOf VoiceCommandsInterface
   */
  updateStatusIcon: function(aIconType) {
    var path = '../images/';
    var icons = {
      battery: 'battery.png',
      fxosLogo: 'ff.png',
      messages: 'mail.png',
      microphone: 'mic.png',
      telephone: 'tel.png',
      text: 'sms.png',
      weather: 'sun.png'
    };

    debug('updateStatusIcon to ' + aIconType);

    if (icons[aIconType]) {
      this.statusIcon.background =
        'url(' + path + icons[aIconType] + ') center no-repeat';
    }
    else {
      this.statusIcon.background = 'transparent';
    }
  },

  /**
   *
   */
  setListeningAnimationState: function(aShow) {
    var show = aShow || false;
    this.listeningAnimation.style.display = aShow ? 'block' : 'none';
  },

  /**
   * Say a sentence to the user and optionally wait for a response.
   *
   * @param aSentence The sentence to be spoken.
   * @param aIsWaitingForCommandResponse Indicates we will wait for a response
   *                                     after the sentence has been said.
   */
  say: function(aSentence, aIsWaitingForCommandResponse) {
    debug('VoiceCommandsInterface::say(aSentence = "' + aSentence +
          '", aIsWaitingForCommandResponse = "' + aIsWaitingForCommandResponse +
          '"');

    this.updateStatusText(aSentence);

    // XXXAus: Language should be detected based on system language.
    var language = 'en';
    // XXXAus: Speech synthesis should be a local service.
    var baseURL = 'http://speechan.cloudapp.net/weblayer/synth.ashx?lng=' +
                  language +
                  '&msg=';

    // XXXAus: Using a url to an external service is only a temporary solution.
    var url =  baseURL + aSentence;

    if (aIsWaitingForCommandResponse) {
      this._interpretingCommand = true;
    }

    setTimeout(function() {
      var e = document.createElement('audio');
      e.src = url;
      e.setAttribute('autoplay', 'true');
      if (aIsWaitingForCommandResponse) {
        e.addEventListener('ended', this.listen.bind(this));
      }
    }.bind(this),
    0);
  },

  /**
   * Listen for a response from the user.
   */
  listen: function() {
    debug('VoiceCommandsInterface::listen');

    // Safety check. Probably not necessary but good to have.
    if (!this._interpretingCommand) {
      return;
    }

    // XXXAus: Yuck yuck yuck. We'll have an abstracted UI object that does
    //         all this soon.
    this.updateStatusText('I\'m listening');
    this.updateStatusIcon('listening');

    debug('VoiceCommandsInterface:: listen -- Listening for a command');

    this.speechRecognition.start();
    this.speechRecognition.onresult = (function(event) {
      this._interpretingCommand = false;
      this.setListeningAnimationState(false);

      var transcript = '';
      var partialTranscript = '';

      // XXXAus: Score is always 100 currently.
      var score = '';

      // Assemble the transcript from the array of results
      for (var i = event.resultIndex; i < event.results.length; ++i) {
        debug('VoiceCommandsInterface::listen -- onresult -- processing ' +
              (i + 1) +
              ' of ' + event.results.length);

        if (event.results[i].isFinal) {
          debug('adding "' + event.results[i][0].transcript +
                '" to complete transcript');
          isFinal = true;
          transcript += event.results[i][0].transcript;
          score = event.results[i][0].confidence;
        }
        else {
          debug('adding "' + event.results[i][0].transcript +
                '" to partial transcript');
          partialTranscript += event.results[i][0].transcript;
          score = event.results[i][0].confidence;
        }
      }

      debug('finalized transcript is -- "' + transcript + '"');
      debug('partial transcript is -- "' + partialTranscript + '"');


      // XXXAus: We'll fall back to the partial transcript if there isn't a
      //         final one for now. It actually looks like we never get a
      //         final transcript currently.
      this.updateStatusText(transcript || partialTranscript);

      // If we have a final transcript we will parse it for a valid action.
      if (transcript.length || partialTranscript.length) {
        CommandInterpreter.doThyBidding(transcript || partialTranscript);
      }
    }.bind(this));
  }
};

/**
 * The CommandInterpreter is responsible for interpreting the transcript of the
 * user's voice command and executing the appropriate action.
 */
var CommandInterpreter = {
  /**
   * Interpret and execute the user's requested command.
   */
  doThyBidding: function(aTranscript) {
    debug('CommandInterpreter::doThyBidding(aTranscript = ' + aTranscript +')');

    //
    // XXXAus: This needs to not look like this. At all. It should also return
    //         a promise that resolves with the status of the requested command.
    //
    if (aTranscript.indexOf('weather') > -1) {
      VoiceCommandsInterface.say(
        'Today it is 75 degrees and sunny in Mountain View');
      VoiceCommandsInterface.updateStatusIcon('weather');

      return;
    }

    if (aTranscript.indexOf('messages') > -1) {
      var emails = MessageChecker.getUnseenEmailCount();
      var voicemails = MessageChecker.getUnseenVoicemailCount();

      // XXXAus: Should be from locale!
      VoiceCommandsInterface.say('You have ' + emails + ' emails and ' +
                                 voicemails + ' voicemails.');
      VoiceCommandsInterface.updateStatusIcon('messages');

      return;
    }

    if (aTranscript.indexOf('text') > -1) {
      ContactsSearch.findContact('Aus').then(
        function(contact) {
          VoiceCommandsInterface.updateStatusIcon('text');
          SMS.send(contact.tel[0].value);
        },
        function() {
        });

      return;
    }

    if (aTranscript.indexOf('battery') > -1) {
      BatteryChecker.getBatteryLevel().then(
        function(batteryLevel) {
          // XXXAus: Should be from locale!
          VoiceCommandsInterface.say('Battery at ' + batteryLevel +
                                     ' percent.');
          VoiceCommandsInterface.updateStatusIcon('battery');
        },
        function() {
          VoiceCommandsInterface.say('I don\'t know.');
        });

      return;
    }

    if (aTranscript.indexOf('call') > -1 ||
        aTranscript.indexOf('dial') > -1) {

      ContactsSearch.findContact('Aus').then(
        function(contact) {
          debug(uneval(contact));
          Dialer.dial(contact.tel[0].value);
        },
        function(error) {
          console.error(error);
        });

      VoiceCommandsInterface.updateStatusIcon('telephone');

      return;
    }

    if (aTranscript.indexOf('open') > -1) {
      AppLauncher.launch('calendar');
      return;
    }

    debug('No command found for ' + aTranscript);
  }
}

//
// XXXAus: The following should be split into their own files and instantiated
// when needed only. Good enough for now though.
//

/**
 * Contacts Search.
 */
var ContactsSearch = {
  /**
   * Find a contact, only returns the top hit.
   *
   * The search will prefer finding people by first name rather than last.
   *
   * @param aName The contact name you wish to find.
   * @memberOf ContactsSearch
   */
  findContact: function(aName) {
    debug('ContactsSearch::findContact(aName = ' + aName + ')');
    var promise = new Promise(function(aResolve, aReject) {
      var contacts = navigator.mozContacts;
      if (!contacts) {
        debug('Contacts not available!');
        aReject('Contacts not available!');
        return;
      }

      var name = aName.toLowerCase();
      debug('findContact will use "' + name + '" as search value');

      var options = {
        filterValue : name,
        filterBy    : ['name'],
        filterOp    : 'startsWith',
        filterLimit : 1,
        sortBy: 'givenName',
        sortOrder: 'ascending'
      };

      var req = contacts.find(options);
      req.onsuccess = function(event) {
        debug(event);
        var result = this.result;
        debug('findContact result length = ' + result.length);
        if (result.length) {
          debug('Found a contact --' +
                ' Name = ' + result[0].name[0] + ', ' +
                ' Number = ' + result[0].tel[0].value);
          aResolve(result[0]);
        }
        else {
          aReject(new Error('No contact found.'));
        }
      };
      req.onerror = function() {
        aReject(new Error('No contact found.'));
      };
    });

    return promise;
  }
};

/**
 * Simple voice driven dialer.
 */
var Dialer = {
  /**
   * Dial a specified phone number.
   *
   * @param aPhoneNumber The number to dial.
   * @memberOf Dialer
   */
  dial: function(aPhoneNumber) {
    // Telephony object
    var tel = navigator.mozTelephony;
    // Place a call
    var telCall = tel.dial(aPhoneNumber);
    telCall.onactive = function(e) {
      debug('Connected to ' + aPhoneNumber);
    }
    telCall.ondisconnected = function(e) {
      debug('Disconnected from ' + aPhoneNumber);
    }
    telCall.onerror = function(e) {
      console.error('Error connecting to ' + aPhoneNumber + ' -- ' + e);
    }
  }
};

/**
 * Simple voice driven texting.
 */
var SMS = {
  /**
   * Sends a new SMS via an Activity.
   *
   * @param aPhoneNumber The phone number to text.
   * @param aMessage An optional message to send right away.
   * @return The newly created activity.
   * @memberOf SMS
   */
  send: function(aPhoneNumber, aMessage) {
    var activity = new MozActivity({
      name: 'new',
      data: {
        type: 'websms/sms',
        number: aPhoneNumber,
        message: aMessage
      }
    });

    return activity;
  }
};

/**
 * Simple voice driven application launcher.
 */
var AppLauncher = {
  /**
   * Launch an application by name.
   *
   * @param aAppName The name of the application to launch.
   * @memberOf AppLauncher
   */
  launch: function(aAppName) {
    var findApp = this.findAppByName(aAppName);

    findApp.then(
      function(aApp) {
        debug('Found App Name: ' + aApp.manifest.name +
              ', Version: ' + aApp.manifest.version);
        aApp.launch();
      },
      function(aErr) {
        console.error('AppLauncher::launch --', aErr);
      });
  },

  /**
   * Find an application by name amongst the list of installed apps.
   *
   * @param aAppName The name of the installed application to find.
   * @memberOf AppLauncher
   */
  findAppByName: function(aAppName) {
    debug('AppLauncher::findAppByName(aAppName = ' + aAppName + ')');
    var appName = aAppName.toLowerCase();
    var promise = new Promise(function(aResolve, aReject) {
      var apps = navigator.mozApps.mgmt;
      if (!apps) {
        debug('mozApps not available!');
        aReject('mozApps not available!');

        return;
      }

      appsReq = apps.getAll();
      appsReq.onsuccess = (function() {
        var installedApps = appsReq.result;
        var foundApp = installedApps.find(function(app, index, array) {
          debug('Installed App Name = ' + app.manifest.name.toLowerCase());
          if (app.manifest.name.toLowerCase() == appName) {
            return true;
          }
          return false;
        });

        if (!foundApp) {
          aReject(aAppName + ' not found');
        }

        aResolve(foundApp);
      });
      appsReq.onerror = (function(error) {
        console.error(error);
      })
    });

    return promise;
  }
};

/**
 * Simple voice driven battery checker.
 */
var BatteryChecker = {
  /**
   * Get the current battery level, in percent.
   *
   * @memberOf BatteryChecker
   */
  getBatteryLevel: function() {
    debug('BatteryChecker::getBatteryLevel()');

    var promise = new Promise(function(aResolve, aReject) {
      var battery = navigator.battery;
      if (battery) {
        aResolve(battery.level * 100);
      }
      else {
        aReject('BatteryChecker::getBatteryLevel -- Battery not available');
      }
    });

    return promise;
  }
};

/**
 * Simple voice driven message checker.
 */
var MessageChecker = {
  TYPE_EMAIL: 'email',
  TYPE_VOICEMAIL: 'voicemail',

  TYPES: [this.TYPE_EMAIL, this.TYPE_VOICEMAIL],

  getUnseenMessageCount: function(aTypes) {
    var messageCount = 0;
    if (!aTypes) {
      messageCount += getUnseenEmailCount() + getUnseenVoicemailCount();
    }
    else if (Array.isArray(aTypes)) {
      if (aTypes.contains(MessageChecker.TYPE_EMAIL)) {
        messageCount += getUnseenEmailCount();
      }
      if (aTypes.contains(MessageChecker.TYPE_VOICEMAIL)) {
        messageCount += getUnseenVoicemailCount();
      }
    }

    return messageCount;
  },

  getUnseenEmailCount: function() {
    // XXXAus: Needs fairly intrusive changes to the mail app.
    return 0;
  },

  getUnseenVoicemailCount: function() {
    var voicemail = navigator.mozVoicemail;
    if (!voicemail) {
      debug('mozVoicemail not available!');
      return 0;
    }

    var voicemailStatus = voicemail.getStatus();
    if (!voicemailStatus.hasMessage) {
      return 0;
    }

    return voicemailStatus.messageCount;
  }
};

// Initialize!
VoiceCommandsInterface.init();
