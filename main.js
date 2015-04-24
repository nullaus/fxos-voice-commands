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
    this.speakButton.onclick = this.handleSpeakButtonClick.bind(this);

    this.statusText = document.getElementById('status-text');
    this.statusIcon = document.getElementById('status-icon');
    this.commandsList = document.getElementById('commands-list');
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
                  'call home | ' +
                  'dial home | ' +
                  'check my messages | ' +
                  'text david | ' +
                  'whats my battery level | ' +
                  'open my calendar | ' +
                  'open my email | ' +
                  'open my messages ;';

    this.speechGrammarList.addFromString(grammar, 1);
  },

  /**
   * Register our Activity Handler.
   */
  registerActivityHandler: function() {
    debug('VoiceCommandsInterface::registerActivityHandler');

    // Super basic handling for now.
    navigator.mozSetMessageHandler('activity', (function(activityRequest) {
      this.handleSpeakButtonClick();
    }.bind(this)));
  },

  handleSpeakButtonClick: function() {
    this.updateStatusIcon('fxos-logo');
    // XXXAus: Should load this via l10n.
    this.say('How may I help you?', true);
  },

  /**
   * Updates the status label using the text provided.
   *
   * @param aText The text to put in the status label.
   * @memberOf VoiceCommandsInterface
   */
  updateStatusText: function(aText) {
    this.statusText.style.display = 'block';
    this.statusText.style.visibility = 'visible';
    this.statusText.innerHTML = aText;
  },

  /**
   * Update the status icon using the icon type provided.
   *
   * @param aIconType The type of the icon to use.
   * @memberOf VoiceCommandsInterface
   */
  updateStatusIcon: function(aIconType) {
    debug('VoiceCommandsInterface::updateStatusIcon(aIconType = ' +
          aIconType + ')');

    var validClasses = ['battery', 'fxos-logo', 'messages',
                        'microphone', 'telephone', 'text', 'weather'];
    var classIndex = validClasses.indexOf(aIconType);

    if (classIndex > -1) {
      debug('Setting status icon to ' + validClasses[classIndex]);
      this.statusIcon.style.visibility = 'hidden';
      this.statusIcon.className = validClasses[classIndex];
      this.statusIcon.style.visibility = 'visible';
    }
    else {
      this.statusIcon.style.visibility = 'hidden';
    }
  },

  /**
   * Sets the listening animation state and updates other elements' visibility.
   */
  setListeningAnimationState: function(aShow) {
    var show = aShow || false
    var visibility = show ? 'hidden' : 'visible';
    var display = show ? 'block' : 'none';

    // XXXAus: not too fond of this hiding the status icon and text but
    //         that's just the easiest right now.
    this.statusIcon.style.visibility = visibility;
    this.statusText.style.visibility = visibility;
    this.commandsList.style.visibility = visibility;
    this.listeningAnimation.style.display = display;
  },

  /**
   * Sets the speak button state (enables or disables).
   */
  setSpeakButtonState: function(aDisabled) {
    var disabled = aDisabled || false;
    this.speakButton.classList.toggle('disabled');
    this.speakButton.onclick =
      disabled ? null : this.handleSpeakButtonClick.bind(this);
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

    // Disable the speak button until text-to-speech is inactive.
    this.setSpeakButtonState(true);
    this.updateStatusText(aSentence);

    if (aIsWaitingForCommandResponse) {
      this._interpretingCommand = true;
    }

    // Wait an extra 100ms for the audio output to stabilize off.
    setTimeout(function() {
      var speechSynthesisUtterance = new SpeechSynthesisUtterance(aSentence);
      // XXX: Language should be detected based on system language.
      speechSynthesisUtterance.lang = 'en';
      speechSynthesisUtterance.addEventListener('end', (function() {
        // Enable the speak button.
        this.setSpeakButtonState(false);
        // If we're waiting for a command, start listening.
        if (aIsWaitingForCommandResponse) {
          this.listen();
        }
      }).bind(this));
      speechSynthesis.speak(speechSynthesisUtterance);
    }.bind(this),
    100);
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

    this.updateStatusText('How may I help you?');
    this.setListeningAnimationState(true);

    debug('VoiceCommandsInterface:: listen -- Listening for a command');

    this.speechRecognition.start();
    this.speechRecognition.onresult = (function(event) {
      this._interpretingCommand = false;
      this.setListeningAnimationState(false);

      var transcript = '';
      var partialTranscript = '';

      // XXXAus: Confidence is always 100 currently.
      var confidence = 0;

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
          // XXXAus: This is useless right now but the idea is we wouldn't
          //         always complete the action or command requested if the
          //         confidence level is too low.
          confidence = event.results[i][0].confidence;
        }
        else {
          debug('adding "' + event.results[i][0].transcript +
                '" to partial transcript');
          partialTranscript += event.results[i][0].transcript;
          // XXXAus: In theory, partial transcripts shouldn't be used as their
          //         confidence will always be lower than a final transcript.
          //         We should ask the user to repeat what they want when all
          //         we have is a partial transcript with 'low' confidence.
          confidence = event.results[i][0].confidence;
        }
      }

      debug('finalized transcript is -- "' + transcript + '"');
      debug('partial transcript is -- "' + partialTranscript + '"');

      // XXXAus: We'll fall back to the partial transcript if there isn't a
      //         final one for now. It actually looks like we never get a
      //         final transcript currently.
      var usableTranscript = transcript || partialTranscript;

      // XXXAus: Ugh. This is really crappy error handling.
      if (usableTranscript == "ERROR") {
        this.say('I\'m sorry, I didn\'t understand.');
      }
      else if (usableTranscript.length) {
        // If we have a usable transcript we will parse it for a valid action.
        this.updateStatusText(usableTranscript);
        CommandInterpreter.doThyBidding(usableTranscript);
      }
    }.bind(this));
  }
};

/**
 * The CommandRegistrar is responsible for keeping track of the registered
 * commands as well as enable looking up a command based on a transcript.
 *
 * XXXAus: It should also be used by the VoiceCommandsInterface to generate
 *         the grammar list.
 *
 * XXXAus: As you can see, this isn't in use yet.
 */
var CommandRegistrar = {
  _commands: [],

  registerCommand: function(aCommandHandler) {

  },

  findCommandFromTranscript: function(aTranscript) {

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
    // XXXAus: This is super jank. There should be a central keeper of all
    //         possible commands. These should all get a chance to interpret
    //         the command until the one with the highest confidence to fulfill
    //         is found. Then we simply "run" this command.
    //

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

    if (aTranscript.indexOf('check') > -1 &&
        aTranscript.indexOf('messages') > -1) {
      var emails = MessageChecker.getUnseenEmailCount();
      var voicemails = MessageChecker.getUnseenVoicemailCount();

      // XXXAus: Should be from locale!
      VoiceCommandsInterface.say('You have ' + emails + ' emails and ' +
                                 voicemails + ' voicemails.');
      VoiceCommandsInterface.updateStatusIcon('messages');

      return;
    }

    if (aTranscript.indexOf('text') > -1) {
      ContactsSearch.findContact('David').then(
        function(contact) {
          VoiceCommandsInterface.updateStatusIcon('text');
          SMS.send(contact.tel[0].value);
        },
        function() {
          VoiceCommandsInterface.say('I couldn\'t find that contact.');
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

      ContactsSearch.findContact('Home').then(
        function(contact) {
          Dialer.dial(contact.tel[0].value);
        },
        function(error) {
          VoiceCommandsInterface.say('I couldn\'t find that contact.');
        });

      return;
    }

    if (aTranscript.indexOf('open') > -1) {
      //
      // XXXAus: The right way to do this would be to create grammar entries
      //         for opening each current installed application. We don't do
      //         this right now but it would be fairly easy to do this.
      //
      if (aTranscript.indexOf('calendar') > -1) {
        AppLauncher.launch('calendar');
      }
      else if (aTranscript.indexOf('email') > -1) {
        AppLauncher.launch('e-mail');
      }
      else if (aTranscript.indexOf('messages')) {
        AppLauncher.launch('messages');
      }

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
    // XXXAus: Needs fairly intrusive changes to the mail app. Hardcoded
    //         for demonstration purposes only!
    return 3;
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
