var apiroot = "https://newdev.smilebasicsource.com/api";
//var discordBots = [ ];

var actiontext = {
   "c" : "Create",
   "r" : "Read",
   "u" : "Edit",
   "d" : "Delete"
};

var attr = {
   "pulsedate" : "data-maxdate",
   "pulsecount" : "data-pwcount",
   "pulsemaxid" : "data-pwmaxid",
   "perms" : "data-permissions"
};

var everyoneUser = { username: "Everyone", avatar: 0, id: 0};

//Will this be stored in user eventually?
var options = {
   displaynotifications : { def : false, u: 1, text : "Device Notifications" },
   //loadcommentonscroll : { def: true, u: 1, text : "Auto load comments on scroll (iOS buggy)" },
   quickload : { def: true, u: 1, text : "Load parts of page as they become available" },
   collapsechatinput : { def: false, u: 1, text : "Collapse chat textbox" },
   generaltoast : { def: true, u: 1, text : "Action toasts (mini alert)" },
   /*oldschool : {def: false, u: 1, text: "Oldschool" },*/
   discussionscrollspeed : { def: 0.22, u: 1, text: "Scroll animation (1 = instant)", step: 0.01 },
   imageresolution : { def: 1, u: 1, text: "Image resolution scale", step : 0.05 },
   filedisplaylimit: { def: 40, u: 1, text : "Image select files per page" },
   pagedisplaylimit: { def: 1000, u: 1, text: "Display pages per category" },
   titlenotifications : { def : "none", u: 1, text : "Title Notifications",
      options: ["none", "all", "currentpage"] },
   defaultmarkup : {def:"12y", u: 1, options: [ "12y", "plaintext", "bbcode" ], text: "Default discussion markup"},
   animatedavatars : { def : "all", u: 1, text : "Animated avatars (must reload)",
      options: ["all", "none" ] },
   theme : {def: "light", u: 1, text: "Theme", options: [ "default", "dark", "blue",
      "contrast", "dark-contrast","oldschool" ]},
   datalog : { def: false, text : "Log received data objects" },
   drawlog : { def: false, text : "Log custom render data" },
   domlog : { def: false, text : "Log major DOM manipulation" },
   apilog : { def: true, text : "Log API calls" },
   loglongpoll : { def: false, text : "Log longpoller events (could be many)" },
   loglongpollreq : { def: false, text : "Log longpoller requests" },
   logperiodicdata : { def: false, text : "Log runtime data every refresh cycle (FREQUENT)" },
   logprofiler : { def: false, text : "Log performance profiling (a lot)" },
   forcediscussionoutofdate : {def: false, text : "Force an immediate 400 error on long poll"},
   retrievetechnicalinfo : {def:true, text : "Pull API info on page load" },
   toastrequestoverload : {def:false, text : "Toast 429 (too many requests) errors" },
   initialloadcomments: { def: 60, text: "Initial comment pull" },
   oldloadcomments : { def: 100, text: "Load more comment amount" },
   activityload : { def: 100, text: "Activity load count" },
   browsedisplaylimit : { def: 1000, text : "Browse items per page (PLEASE BE CAREFUL)" },
   discussionscrolllock : { def: 0.15, text: "Page height % chat scroll lock", step: 0.01 },
   discussionresizelock : { def: 20, text: "Device pixels to snap outer container resize" },
   notificationtimeout : { def: 5, text: "Notification timeout (seconds)" },
   breakchatmessagetime : { def: 600, text: "Seconds between split chat message" },
   pulsepasthours : { def: 24 },
   discussionavatarsize : { def: 60 },
   showsidebarminrem : { def: 60 },
   refreshcycle : { def: 10000 },
   longpollerrorrestart : {def: 5000 },
   minisearchtimebuffer : {def:200},
   signalcleanup : {def: 10000 },
   autohidesidebar : { def: 0.8, step: 0.01 },
   scrolldiscloadheight : {def: 1.5, step: 0.01 },
   scrolldiscloadcooldown : {def: 500 },
   frontpageslideshownum : {def:10},
   bgdiscussionmsgkeep : {def:30}, /* these are message BLOCKS, not individual */
   initiallogintab : {def:1},
   defaultpermissions: {def:"cr"},
   sitecss : {def:"",text: "WARN: Custom CSS; ?safemode=1 to disable", multiline : true},
   sitejs : {def:"",text: "WARN: Custom JS; ?safemode=1 to disable", multiline : true}
};

var globals = { 
   lastsystemid : 0,    //The last id retrieved from the system for actions
   loadingOlderDiscussionsTime : 0,
   spahistory : []
};

//Some um... global sturf uggh
function logConditional(d, c, o)
{
   if(getLocalOption(o)) 
   { 
      log.Trace(d); 
      if(c) console.log(c); 
   } 
}

log.Datalog = (d,c) => logConditional(d, c, "datalog");
log.Drawlog = (d,c) => logConditional(d, c, "drawlog");
log.Domlog =  (d,c) => logConditional(d, c, "domlog");
log.Apilog =  (d,c) => logConditional(d, c, "apilog");
log.PerformanceLog =  (d,c) => logConditional(d, c, "logprofiler");


window.Notification = window.Notification || {};

window.onerror = function(message, source, lineno, colno, error)
{
   notifyError(message + "\n(" + source + ":" + lineno + ")"); 
};

//OK now we can finally load and do things?
window.onload = function()
{
   log.Info("Window load event");

   //Set up the dependencies? ummm
   DomDeps.log = (d,c) => log.Domlog(d, c);
   DomDeps.signal = (name, data) => signals.Add(name, data);

   Templates.signal = (name, data) => signals.Add(name, data);
   Templates.imageLink = getComputedImageLink;
   Templates.links = Links;
   Templates.log = log;

   Templates.ActivateTemplates(website);

   //This is SO IMPORTANT that you can't do it on a frame, has to be done now
   finalizeTemplate(website);

   setupSignalProcessors();

   //These settings won't apply until next load ofc
   var signaller = (name, data) => signals.Add(name, data);

   globals.api = new Api(apiroot, signaller);
   globals.api.getToken = getToken;
   globals.api.getUserId = getUserId;

   globals.longpoller = new LongPoller(globals.api, signaller, (m, c) => logConditional(m, c, "loglongpoll"));
   globals.longpoller.errortime = getLocalOption("longpollerrorrestart");
   globals.longpoller.instantComplete = handleLongpollData;
   interruptSmoothScroll();

   CommandSystem.api = globals.api;
   CommandSystem.commandinput = postdiscussiontext;
   CommandSystem.realmessage = sendDiscussionMessage;
   CommandSystem.message = msg => 
   {
      var d = getActiveDiscussion();

      if(!d)
      {
         notifyError("No discussion to place module message: " + msg.message);
         return;
      }

      if(!msg.id)
      {
         var allmsgs = d.querySelectorAll("[data-messageid]");//.getAttribute("data-messageid")) + 0.001;
         msg.id = Number(allmsgs[allmsgs.length - 1].getAttribute("data-messageid")) + 0.001;
      }

      var tmpl = Templates.LoadHere("modulemessage", {modulemessage:msg});

      writeDom(() => d.template.innerTemplates.messagecontainer.element.appendChild(tmpl));
   }

   var ww = Utilities.ConvertRem(Utilities.WindowWidth());
   log.Debug("Width REM: " + ww + ", pixelRatio: " + window.devicePixelRatio);

   writeDom(() =>
   {
      if(ww >= getLocalOption("showsidebarminrem"))
         rightpanetoggle.click();

      initializePage("pageload");
   });

   setupSpa();

   //Little setup here and there
   UIkit.util.on('#logsparent', 'show', () => writeDom(() => logs.template.UpdateLogs(log.messages)));

   setupTechnicalInfo();
   setupUserStuff();
   setupFileUpload();
   setupPageControls();
   setupDiscussions();
   setupSearch();

   setupSession();

   //Regardless if you're logged in or not, this will work "correctly" since
   //the spa processor will take your login state into account. And if you're
   //not "REALLY" logged in, well whatever, better than processing it twice.
   globals.spa.ProcessLink(document.location.href);

   //Begin render
   globals.render = { lastrendertime : performance.now() };
   requestAnimationFrame(renderLoop);
   refreshCycle();

   //12's renderer replacements
   Parse.options.youtube = (args,preview) => 
   {
      var url = args[""];
      var yti = Utilities.ParseYoutube(url);
      var parseurl = null;
      if(yti.id)
      {
         parseurl = "https://www.youtube-nocookie.com/embed/"+yti.id+"?autoplay=1";
         if (yti.start) parseurl += "&start="+yti.start;
         if (yti.end) parseurl += "&end="+yti.end;
         if (yti.loop) parseurl += "&loop=1&playlist="+yti.id;
      }
      return {block:true,node:Templates.LoadHere("youtubepreview", {url: url, youtubeurl:parseurl}) };
   };
   Parse.options.image = (args) =>
   {
      var img = cloneTemplate("contentimage");
      findSwap(img, "src", args[""]);
      finalizeTemplate(img);
      return {block:true, node:img};
   };
   StolenUtils.AttachResize(rightpane, rightpanefootername, true, -1, "halfe-sidebar");

};

function safety(func)
{
   try { func(); }
   catch(ex)
   {
      notifyError("Failed: " + ex.message);
      console.log("safety exception: ", ex);
   }
}

function stopObservingUikit(action)
{
   var lost = window.uikitobserver.takeRecords();
   if(lost.length > 0)
      notifyError("Lost " + lost.length + " uikit mutation observer events!");
   window.uikitobserver.disconnect();
   action();
   window.uikitobserver.observe(document, {
      childList: !0,
      subtree: !0,
      characterData: !0,
      attributes: !0
   });
}

function specialSort(parent, sortFunc, descending)
{
   stopObservingUikit(() => Utilities.SortElements(parent, sortFunc, descending));
}

// ***************************
// --- CYCLES (TIMERS ETC) ---
// ***************************

function refreshCycle()
{
   writeDom(() =>
   {
      refreshPWDates(pulse);
      refreshPWDates(watches);
   });

   var ctime = getLocalOption("signalcleanup");
   var now = performance.now();

   if(getLocalOption("logperiodicdata"))
   {
      var message = "Periodic data:";
      message += "\nPollers: " + globals.longpoller.pending.map(x => "[" + x.rid + "]").join(", ");
      message += "\nSignals: " + Object.keys(signals.signals)
         .filter(x => signals.signals[x].length)
         .map(x => x + "[" + signals.signals[x].length + "]").join(", ");
      message += "\nLog buffer: " + log.messages.length;
      log.Debug(message);
   }

   //Oops, no rendering for a while, so process signals now. DON'T log this,
   //it's not necessary. if people need to know, enable periodic data, it will
   //tell if signals were processed
   if(now - globals.render.lastrendertime > Math.min(100, ctime / 3))
      signalProcess(now);

   signals.ClearOlderThan(now - ctime);

   //This is called instead of setInterval so users can change this and have it
   //update immediately
   globals.refreshCycle = setTimeout(refreshCycle, getLocalOption("refreshcycle"));
}

function signalProcess(now)
{
   //FIRST, do all the stuff that requires reading the layout
   signals.Process("formatdiscussions", now);

   //NEXT, do stuff where the order doesn't matter
   signals.ProcessAuto(now);

   //THEN, do all the stuff that requires modifying the layout,
   //DO NOT read past this point EVER!
   signals.Process("wdom", now);
}

function renderLoop(time)
{
   try
   {
      var delta = time - globals.render.lastrendertime;

      //CAN'T set attributes repeatedly because of observer
      if(rightpane.clientWidth != globals.rightpaneClientWidth)
      {
         //With new uikit observer restrictions, it's OK to write these on
         //resize. obviously don't write it all the time, but...
         if(rightpane.clientWidth < 400)
            rightpane.setAttribute("data-condensed", "true");
         else 
            rightpane.removeAttribute("data-condensed");
      }

      //Always read first!!! Check stuff here and then schedule actions for
      //later with signalling.
      var baseData = { 
         //Scrolldiff is current difference between this frame and last frame
         //(determines current scroll direction)
         scrollDiff: Math.floor(discussions.scrollTop) - Math.floor(globals.discussionScrollTop),
         //Scroll bottom is how close to the bottom the scroller is (old and
         //current for different needs)
         oldScrollBottom: (globals.discussionScrollHeight - globals.discussionClientHeight - 
                        globals.discussionScrollTop),
         currentScrollBottom: (discussions.scrollHeight - discussions.clientHeight - 
                        discussions.scrollTop),
         oldScrollHeight : globals.discussionScrollHeight,
         oldScrollTop : globals.discussionScrollTop,
         oldClientHeight : globals.discussionClientHeight,
         oldClientWidth : globals.discussionClientWidth,
         currentScrollHeight : discussions.scrollHeight,
         currentScrollTop : discussions.scrollTop,
         currentClientHeight : discussions.clientHeight,
         currentClientWidth : discussions.clientWidth
      };

      //NOTE: USE BASEDATA WHENEVER POSSIBLE IN THIS SECTION

      //The actual discussion CONTAINER (the square on screen, not the list
      //with messages) changed sizes, maybe due to the sidebar opening / etc.
      //These resizes override other types of resizes... or should they?
      if(Math.floor(baseData.currentClientHeight) !== Math.floor(baseData.oldClientHeight) ||
         Math.floor(baseData.currentClientWidth) !== Math.floor(baseData.oldClientWidth))
      {
         //Instant jump, interrupt smooth scroll
         if(baseData.oldScrollBottom < getLocalOption("discussionresizelock")) 
         {
            if(!isSmoothScrollInterrupted())
               log.Drawlog("Smooth scroll INTERRUPTED by instant jump due to overall discussion resize: " +
                  "oldClientHeight: " + baseData.oldClientHeight + ", current: " + baseData.currentClientHeight);
            interruptSmoothScroll();
            scrollBottom(discussions);
         }

         signals.Add("discussionresize", baseData);
      }
      //This should be activated on ANY inner discussion resize (so like images
      //loading or messages getting added, etc)
      else if(Math.floor(baseData.oldScrollHeight) !== Math.floor(baseData.currentScrollHeight))
      {
         //Begin nice scroll to bottom
         if(shouldAutoScroll(baseData))
         {
            log.Drawlog("Smooth scrolling now, all data: " + JSON.stringify(baseData));
            if(baseData.currentScrollBottom <= 0)
            {
               log.Warn("ScrollTop snapped to bottom without our input (is this a browser bug?), forcing " +
                  "scroll anyway by manipulating baseData");
               baseData.currentScrollTop = baseData.oldScrollTop;
               baseData.currentScrollBottom = baseData.currentScrollHeight - baseData.oldScrollHeight;
            }
            globals.smoothScrollNow = baseData.currentScrollTop; //discussions.scrollTop;
         }
         else
         {
            log.Warn("Not smooth scrolling on resize (not at bottom): " + JSON.stringify(baseData));
         }

         signals.Add("discussionscrollresize", baseData);
      }
      //We only detect scrolling up/down when the discussion hasn't changed sizes, is this acceptable?
      else if(baseData.scrollDiff < 0) //ONLY scrolldiff if there's not a change in scroll height
      {
         signals.Add("discussionscrollup", baseData);
      }

      //This is the smooth scroller!
      if(!isSmoothScrollInterrupted())
      {
         if(Math.abs(baseData.currentScrollTop - globals.smoothScrollNow) <= 1)
         {
            //We will go at MINIMUM half framerate (to prevent huge stops from
            //destroying the animation)
            var cdelta = Math.min(32, delta);
            var scm = Math.max(1, cdelta * 60 / 1000 * 
               getLocalOption("discussionscrollspeed") * Math.abs(baseData.currentScrollBottom));
            log.Drawlog("btmdistance: " + baseData.currentScrollBottom + ", scm: " + scm + ", delta: " 
               + cdelta + ", apparentscrolltop: " + baseData.currentScrollTop); //discussions.scrollTop);
            //These are added separately because eventually, our scrolltop will move
            //past the actual assigned one
            globals.smoothScrollNow = Math.ceil(globals.smoothScrollNow + scm);
            writeDom(() => discussions.scrollTop = globals.smoothScrollNow);
         }
         else
         {
            interruptSmoothScroll();
            log.Drawlog("Smooth scroll interrupted at " + baseData.scrollDiff + " from bottom")
         }
      }

      globals.discussionClientHeight = discussions.clientHeight;
      globals.discussionClientWidth = discussions.clientWidth;
      globals.discussionScrollHeight = discussions.scrollHeight;
      globals.discussionScrollTop = discussions.scrollTop;
      globals.rightpaneClientWidth = rightpane.clientWidth;

      signalProcess(time);
      globals.render.lastrendertime = time;
      requestAnimationFrame(renderLoop);
   }
   catch(ex)
   {
      UIkit.modal.alert(
         "WEBSITE FULL CRASH: renderLoop failed with exception: " + ex + " (see dev tools log)")
      console.log("renderLoop exception: ", ex);
   }
}


// ********************
// ---- SETUP CODE ----
// ********************

function setupSignalProcessors()
{
   //THESE signals need to be run manually, because the order matters
   ["wdom", "formatdiscussions"].forEach(x => signals.AddAutoException(x));

   //Some of these signals are treated as plain "events" so I don't have to do
   //proper dependency injection and interfacing and all that, this is a 
   //simple-ish project. They should follow the _event convention to distinguish them
   signals.Attach("wdom", data => data());
   //signals.Attach("loadoldercomments_event", data => loadOlderComments(data));
   signals.Attach("spaclick_event", data => globals.spa.ProcessLinkContextAware(data.url));
   signals.Attach("localsettingupdate_event", data => setLocalOption(data.key, data.value));
   
   signals.Attach("setlocaloption", data => writeDom(() => handleSetting(data.key, data.value)));
   signals.Attach("clearlocaloption", data => writeDom(() => handleSetting(data.key, data.value)));
   signals.Attach("setloginstate", state =>
   {
      if(state)
         document.querySelectorAll('#rightpanenav a')[getLocalOption("initiallogintab")].click();
   });

   signals.Attach("spastart", parsed => 
   {
      setLeaveProtect(false);
      if((rightpane.clientWidth / window.innerWidth) > getLocalOption("autohidesidebar"))
         writeDom(() => hide(rightpane));
      quickLoad(parsed);
   });

   signals.Attach("setcontentmode", type =>
   {
      if(!isPageLoading())
         setRememberedFormat(getActiveDiscussionId(), type);
   });

   //These are so small I don't care about them being directly in here
   var apiSetLoading = (data, load) => 
   {
      if(!data.endpoint.endsWith("listen"))
         writeDom(() => { if(load) addLoading(); else removeLoading(); });
   };

   signals.Attach("apinetworkerror", apidat =>
   {
      log.Error("Network error occurred in API; this message is for tracking purposes");
   });
   signals.Attach("apierror", data => 
   {
      if(!data.abortNow && !data.networkError && !data.ignoreError)
      {
         //TODO: This eventually needs to tell you HOW LONG you're banned and
         //who banned you. Make it return json you can parse from responseText
         if(data.request.status == 418)
         {
            notifyError("You're temporarily banned: '" + data.request.responseText + "'");
         }
         else if(data.request.status == 401)
         {
            globals.longpoller.TryAbortAll(); //TODO: This could break things if other stuff throws 401
            writeDom(() => setConnectionState("error"));
            UIkit.modal.confirm("Unauthorized access: assuming your login token expired. " +
               "Press OK to reload so you can login again.").then(x =>
            {
               location.reload();
            });
         }
         else if(data.request.status == 429 && data.endpoint === "read/listen")
         {
            if(getLocalOption("toastrequestoverload"))
               notifyError("Long poll: Too many requests from your IP (429)");
            else
               log.Warn("Long poll overload: " + globals.api.FormatData(data));
         }
         else
         {
            notifyError("API Error: " + globals.api.FormatData(data));
         }
      }
   });
   signals.Attach("apistart", data =>
   {
      apiSetLoading(data, true);
      if(!(data.endpoint === "read/listen" && !getLocalOption("loglongpollreq")))
         log.Apilog("[" + data.rid + "] " + data.method +  ": " + data.url);
   });
   signals.Attach("apiend", data =>
   {
      apiSetLoading(data, false);
      log.Apilog(globals.api.FormatData(data) + " (" + data.request.response.length + "b)");
   });

   signals.Attach("longpollstart", data => writeDom(() => setConnectionState("connected")));
   signals.Attach("longpollabort", data => writeDom(() => setConnectionState("aborted")));
   signals.Attach("longpollerror", data => 
   {
      log.Error("Can't connect to live updates: " + data.request.status + " - " + data.request.statusText);
      writeDom(() =>setConnectionState("error"));
   });
   signals.Attach("longpollalways", data => { globals.lastsystemid = data.lpdata.lastId });
   signals.Attach("longpollfatal", data =>
   {
      writeDom(() => setConnectionState("error"));
      UIkit.modal.confirm("Live updates recover from error. " +
         "This can happen when the page gets unloaded for a long time, and is normal. " +
         "Press OK to reload page.\n\nIf you " +
         "CANCEL, the website will not function properly!").then(x =>
      {
         location.reload();
      });
   });

   //You MUST be able to assume that discussions and all that junk are fine at
   //this point.
   signals.Attach("routecomplete", data =>
   {
      //Don't worry about long polling at all if you're not logged in
      if(getToken())
      {
         var statuses = { "-1" : "online" };
         var cid = getActiveDiscussionId();
         if(cid) statuses[cid] = "online";
         tryUpdateLongPoll(statuses);
      }

      var page = maincontent.firstElementChild;
      if(page.hasAttribute(attr.perms))
         leftpane.setAttribute(attr.perms, page.getAttribute(attr.perms));
      else
         leftpane.removeAttribute(attr.perms);
   });

   signals.Attach("formatdiscussions", data =>
   {
      if(data.hasDiscussion)
      {
         log.Drawlog("Format discussions, scrolling to bottom now: " + JSON.stringify(data));
         interruptSmoothScroll();
         scrollBottom(discussions);
      }
   });

   //signals.Attach("discussionscrollup", data =>
   //{
   //   //if(!isSmoothScrollInterrupted())
   //   //Don't let smooth scrolling perform a load of comments etc.
   //   if(data.currentScrollTop !== 0 && isSmoothScrollInterrupted() && 
   //      getLocalOption("loadcommentonscroll") && data.currentScrollTop <
   //      getLocalOption("scrolldiscloadheight") * data.currentClientHeight &&
   //      !shouldAutoScroll(data))
   //   {
   //      loadOlderCommentsActive();
   //   }
   //});

   signals.Attach("hidediscussion", d =>
   {
      var dsc = d.discussion;
      var messages = dsc.querySelectorAll('[data-messageframe]:not([data-uid="0"])');
      var remove = messages.length - getLocalOption("bgdiscussionmsgkeep");
      if(remove > 0)
      {
         log.Info("Removing " + remove + " messages from background discussion " + dsc.id);
         for(var i = 0; i < remove; i++)
            Utilities.RemoveElement(messages[i]);
         dsc.template.hasmorecomments = true;
         //dsc.removeAttribute(attr.atoldest);
      }
   });
}

//TODO: TEMPORARY LOCATION
function interruptSmoothScroll()
{
   globals.smoothScrollNow = Number.MIN_SAFE_INTEGER;
}

function isSmoothScrollInterrupted()
{
   return globals.smoothScrollNow === Number.MIN_SAFE_INTEGER;
}

function shouldAutoScroll(baseData)
{
   return baseData.oldScrollBottom < baseData.oldClientHeight * getLocalOption("discussionscrolllock") ||
      baseData.currentScrollBottom < baseData.currentClientHeight * getLocalOption("discussionscrolllock");
}

function scrollBottom(element)
{
   writeDom(() => Utilities.ScrollToBottom(discussions));
}

var leaveProtectFunc = (e) => { e.preventDefault(); e.returnValue = ''; };

function setLeaveProtect(protect)
{
   if(protect)
   {
      globals.leaveprotect = true;
      window.addEventListener("beforeunload", leaveProtectFunc);
   }
   else
   {
      globals.leaveprotect = false;
      window.removeEventListener("beforeunload", leaveProtectFunc);
   }
}

function setupSpa()
{
   globals.spa = new BasicSpa(log);

   //For now, we have ONE processor!
   globals.spa.Processors.push(DefaultSpaRouting);
   globals.spa.SetHandlePopState();

   log.Debug("Setup SPA, override handling popstate");
}

function setupTechnicalInfo()
{
   if(getLocalOption("retrievetechnicalinfo"))
   {
      globals.api.Get("test/info", "", (data) =>
      {
         log.Debug("Received technical info from API");

         writeDom(() =>
         {
            multiSwap(technicalinfo, {
               apiroot: apiroot,
               apiversion: data.data.versions.contentapi,
               entitysystemversion: data.data.versions.entitysystem
            });
         });
      });
   }
}

function setupPageControls()
{
   var makeSet = f => function(event) 
   { 
      event.preventDefault(); 
      writeDom(f);
   };

   fulldiscussionmode.onclick = makeSet(setFullDiscussionMode);
   fullcontentmode.onclick = makeSet(setFullContentMode);
   movedownmode.onclick = makeSet(increaseMode);
   moveupmode.onclick = makeSet(decreaseMode);

   log.Debug("Setup page controls");
}

function setupUserStuff()
{
   formSetupSubmit(loginform, "user/authenticate", token => login(token));
   userlogout.addEventListener("click", () => logout());

   formSetupSubmit(passwordresetform, "user/passwordreset/sendemail", result =>
   {
      log.Info("Password reset code sent!");
      writeDom(() => passwordresetstep2.click()); //don't know if clicks need to be set up like this...
   });

   formSetupSubmit(passwordresetconfirmform, "user/passwordreset", token =>
   {
      if(getLocalOption("generaltoast"))
         notifySuccess("Password reset!");
      login(token);
   }, formData =>
   {
      if(formData.password != formData.password2)
         return "Passwords don't match!"
      return undefined;
   });

   formSetupSubmit(registerform, "user/register", token =>
   {
      log.Info("Registration submitted! Sending email...");
      globals.api.Post("user/register/sendemail", 
         {"email" : formSerialize(registerform)["email"] },
         data => log.Info("Registration email sent! Check your email"), 
         data => notifyError("There was a problem sending your email. However, your registration was submitted successfully."));
      writeDom(() => registrationstep2.click());
   }, formData =>
   {
      if(formData.password != formData.password2)
         return "Passwords don't match!"
      return undefined;
   });

   formSetupSubmit(registerconfirmform, "user/register/confirm", token =>
   {
      if(getLocalOption("generaltoast"))
         notifySuccess("Registration complete!");
      login(token);
   });
   formSetupSubmit(registerresendform, "user/register/sendemail", token =>
   {
      if(getLocalOption("generaltoast"))
         notifySuccess("Email re-sent!");
   });

   userchangeavatar.addEventListener("click", function() {
      globals.fileselectcallback = id => 
         globals.api.Put("user/basic", {avatar:id}, data => updateCurrentUserData(data.data));
   });

   userinvalidatesessions.addEventListener("click", function(e)
   {
      e.preventDefault();

      UIkit.modal.confirm("This will force ALL sessions EVERYWHERE to be invalid, " + 
         "you will need to log back in to ALL devices. This is useful if you believe " +
         "someone has stolen your session token. Are you SURE you want to do this?").then(function()
      {
         globals.api.Post("user/invalidatealltokens", "pleaseinvalidate", data => logout());
      }, () => log.Debug("Cancelled invalidate tokens"));
   });

   restoredefaultsettings.onclick = (e) => 
   {
      e.preventDefault();

      UIkit.modal.confirm("You will lose all your current device settings, are you " +
         "sure you want to reset to default?").then(function()
      {
         for(key in options)
            clearLocalOption(key);
         refreshOptions();
      }, () => log.Debug("Cancelled invalidate tokens"));
   };

   refreshlocaloptions.onclick = event => {
      event.preventDefault();
      refreshOptions();
   };

   refreshOptions();

   var storeprepend = "savedsettings_";
   var vm = Templates.LoadHere("variablemanager", {
      editlabel : "Current local settings:",
      listlabel : "Saved options:",
      lockedit : true,
      storevariablefunc : (name, value, complete) =>
      {
         globals.api.Post(`variable/${storeprepend}${name}`, value, apidata => {
            complete();
         });
      },
      loadvariablefunc : (name, complete, tobj) =>
      {
         globals.api.Get(`variable/${storeprepend}${name}`, null, apidata => {
            //BEFORE we complete, we must parse the variable! If this fails,
            //don't run complete!
            var newoptions = JSON.parse(apidata.data);
            setLocalOptions(newoptions);
            refreshOptions();
            complete(apidata.data);
         });
      },
      listvariablesfunc : (complete) =>
      {
         globals.api.Get("variable", null, apidata => {
            complete(apidata.data.filter(x => x.startsWith(storeprepend))
               .map(x => x.replace(storeprepend, "")));
         });
      }
   });

   loadstoreoptionsbody.appendChild(vm);

   UIkit.util.on('#loadstoreoptions', 'beforeshow', () =>
   {
      var opts = {};
      for(key in options)
         opts[key] = getLocalOption(key);
      vm.template.fields.variablevalue = JSON.stringify(opts, null, 2);
      vm.template.fields.refreshlist.click();
   });

   log.Debug("Setup all user forms");
}

function setupFileUpload()
{
   var resetFileUploadList = () => 
   {
      log.Debug("Refreshing file upload images");
      setFileUploadList(0, fileuploadsearchall.checked, fileuploadbucket.value);
   };

   var generalProgress = e => writeDom(() => { bar.max = e.total; bar.value = e.loaded; });

   var bar = fileuploadprogress;
   var generalError = () => writeDom(() => {
      if(typeof arguments[0] == 'XMLHttpRequest')
      {
         formError(fileuploadform, arguments[0].status + ": " + arguments[0].message);
      }
      else
      {
         console.log("Unknown error during upload: ", arguments);
         formError(fileuploadform, "Unknown error (Image may be too large)");
      }
      bar.setAttribute('hidden', 'hidden');
   });

   var generateFUParams = () => {
      var fuparams = new URLSearchParams();
      if(fileuploadbucket.value) 
         fuparams.append("bucket", fileuploadbucket.value);
      return fuparams.toString();
   };

   //Set the last used bucket
   if(getToken())
   {
      globals.api.Get(`variable/multi/`, "keys=lastUsedBucket", apidata => {
         if(apidata.data.lastUsedBucket)
         {
            log.Debug("Previous bucket found, setting bucket to " + apidata.data.lastUsedBucket);
            fileuploadbucket.value = apidata.data.lastUsedBucket;
         }
         else
         {
            log.Debug("No previous bucket found, clearing bucket");
            fileuploadbucket.value = "";
         }
      });
   }
   
   var baseFUuikitObject =
   {
      multiple: false,
      mime: "image/*",
      name: "file",
      beforeSend: e => { e.headers["Authorization"] = "Bearer " + getToken(); },
      loadStart: e => writeDom(() => { bar.removeAttribute('hidden'); bar.max = e.total; bar.value = e.loaded; }),
      progress: generalProgress,
      loadEnd: generalProgress,
      error: generalError,
      fail: generalError,
      completeAll: function () {
         log.Info("Upload complete");
         globals.api.Post(`variable/lastUsedBucket`, fileuploadbucket.value, apidata => 
            log.Info("Saved last used bucket as " + fileuploadbucket.value));
         writeDom(() => 
         {
            addFileUploadImage(JSON.parse(arguments[0].responseText), fileuploaditems.childElementCount);
            setTimeout(function () { 
               bar.setAttribute('hidden', 'hidden'); 
               fileuploadthumbnails.lastElementChild.firstElementChild.click();
            }, 200); // for some reason, must wait before can click
         });
      }
   };

   var resetUpload = () =>
   {
      baseFUuikitObject.url = apiroot + '/file?' + generateFUParams(), 
      log.Debug("Resetting file upload to point to: " + baseFUuikitObject.url);
      UIkit.upload('#fileuploadform', baseFUuikitObject);
   };

   resetUpload();

   UIkit.util.on('#fileupload', 'beforeshow', resetFileUploadList);
   fileuploadsearchall.addEventListener("change", resetFileUploadList);
   fileuploadbucket.addEventListener("input", () => { resetFileUploadList(); resetUpload(); });

   //this is the "dynamic loading" to save data: only load big images when
   //users click on them
   UIkit.util.on("#fileuploadslideshow", "beforeitemshow", e => writeDom(() => 
      e.target.firstElementChild.src = e.target.firstElementChild.getAttribute("data-src")));

   fileuploadselect.addEventListener("click", function()
   {
      //Find the selected image
      var selectedImage = document.querySelector("#fileuploadthumbnails li.uk-active");

      //Call the "function" (a global variable! yay!)
      if(globals.fileselectcallback)
      {
         //for safety, remove callback
         globals.fileselectcallback(getSwap(selectedImage, "fileid")); 
         globals.fileselectcallback = false;
      }
   });


   fileupload.addEventListener('paste', function(event) {
      var data = event.clipboardData;
      if (data && data.files) {
         var file = data.files[0];
         if (file && (/^image\//).test(file.type))
         {
            fileuploadform.__uikit__.upload.upload([file]);
         }
      }
   });

   log.Debug("Setup all file uploading/handling");
}

function sendDiscussionMessage(message, markup, error)
{
   var currentDiscussion = getActiveDiscussionId();
   var sendData = {
      "parentId" : Number(currentDiscussion),
      "content" : FrontendCoop.CreateComment(message, markup, getUserAvatar())
   };

   globals.api.Post("comment", sendData, undefined, error );
   signals.Add("sendcommentstart", sendData);
}

//Right now, this can only be called once :/
function setupDiscussions()
{
   postdiscussiontext.onkeypress = function(e) 
   {
		if (!e.shiftKey && e.keyCode == 13)
      {
			e.preventDefault();

         var currentText = postdiscussiontext.value;

         if(!currentText)
            return;

         postdiscussiontext.value = "";

         if(currentText.startsWith("/"))
         {
            currentText = currentText.substr(1);

            if(!currentText.startsWith("/"))
            {
               handleCommand(currentText);
               return;
            }
         }

         sendDiscussionMessage(currentText, getLocalOption("defaultmarkup"), error =>
         {
            postdiscussiontext.value = currentText;
         });
		}
	};

   discussionimageselect.addEventListener("click", function() {
      globals.fileselectcallback = function(id) { //TODO: this assumes 12y format
         if(postdiscussiontext.value && !postdiscussiontext.value.endsWith(" "))
            postdiscussiontext.value += " ";
         postdiscussiontext.value += "!" + getComputedImageLink(id);
      };
   });

   log.Debug("Setup discussions (scrolling/etc)");
}

function handleCommand(full)
{
   try
   {
      CommandSystem.addHistory(full);

      var cmdparts = full.split(" ").filter(x => x);
      var cmd = cmdparts[0].toLowerCase();

      //TODO: Fix this so it understand what KIND of command it is, and also
      //looks up commands from the server. Commands with no parameters can be
      //printed as-is with help beside them, but any with parameters will need
      //their own help
      if(cmd == "help")
      {
         var help = "Available commands:\n";
         help += Object.keys(Commands).map(x => "/" + x.padEnd(15, " ") + Commands[x].description).join("\n");
         CommandSystem.print(help);
         //CommandSystem.print("Help coming soon, try /hide and /unhide");
      }
      else if(cmd in Commands)
      {
         Commands[cmd].process(full, cmdparts);
      }
      else
      {
         throw "Server commands will come soon";
      }
   }
   catch(ex)
   {
      notifyError("Error during command: " + (ex.message || ex));
      console.log(ex);
      //CommandSystem.commandinput.value = CommandSystem._history[CommandSystem._history.length - 1];
      //Do this... better.
      Commands[".."].process("", ["-1"]);
   }
}

function setupSearch()
{
   searchform.onsubmit = doSearch;
   searchformicon.onclick = doSearch;
}

//Tied directly to setupSearch I guess
function doSearch(event)
{
   event.preventDefault();
   searchinput.blur();

   var searchops = {
      reverse : searchreverseoption.checked,
      sort: searchsortoption.value,
      value : searchinput.value,
      search : {
         pages : searchpagesoption.checked,
         users : searchusersoption.checked,
         categories : searchcategoriesoption.checked
      }
   };

   //Don't search on empty
   if(!searchops.value)
   {
      handleSearchResults(false);
      return;
   }

   globals.api.Search(searchops, data =>
   {
      log.Datalog("see devlog for search data", data);
      handleSearchResults(data.data);
   });
}


function pageerror(title, message)
{
   writeDom(() =>
   {
      renderPage("routeerror", template => safety(() => 
      {
         multiSwap(template, {
            message : message,
            title : title 
         });
      }));

      signals.Add("pageerror", {title: title, message: message});
   });
}

function finishPageControls(t, c)
{
   t.innerTemplates.pagecontrols.SetFields({
      deleteaction: (event) =>
      {
         event.preventDefault();

         if(confirm("Are you SURE you want to delete this page?"))
            globals.api.Delete("content", c.id, () => location.href = Links.Category(c.parentId));
      },
      pinaction : (event) =>
      {
         event.preventDefault();
         //look up the parent as it is now, parse pinned, add page, convert to
         //set, store back
         globals.api.Get("category", "ids=" + c.parentId, apidat =>
         {
            var ct = apidat.data[0];
            DataFormat.AddPinned(ct, c.id);
            globals.api.Put("category/"+ct.id, ct, () => globals.spa.ProcessLink(location.href));
         });
      },
      unpinaction : (e) =>
      {
         event.preventDefault();
         //look up the parent as it is now, parse pinned, add page, convert to
         //set, store back
         globals.api.Get("category", "ids=" + c.parentId, apidat =>
         {
            var ct = apidat.data[0];
            DataFormat.RemovePinned(ct, c.id);
            globals.api.Put("category/"+ct.id, ct, () => globals.spa.ProcessLink(location.href));
         });
      },
      votefunc : (vote, fail) =>
      {
         var myfail = (apidat) => { 
            fail();
            notifyError("Vote request failed: " + apidata.request.status + " - " + 
               apidata.request.statusText);
         };
         if(vote)
         {
            log.Info("Setting vote to " + vote + " for : " + c.id);
            globals.api.Post("vote/" + c.id + "/" + vote, {}, apidata => 
               log.Info("Vote " + c.id + " successful!"), myfail);
         }
         else
         {
            log.Info("Removing vote from : " + c.id);
            globals.api.Delete("vote", c.id, data => 
               log.Info("Remove vote " + c.id + " successful!"), myfail);
         }
      },
      watchfunc: (watch, fail) =>
      {
         var myfail = (apidat) => { 
            fail();
            notifyError("Watch request failed: " + apidata.request.status + " - " + 
               apidata.request.statusText);
         };
         log.Info("Setting watch to: " + watch);
         if(watch) 
         {
            globals.api.Post("watch/" + c.id, {}, apidata => 
               log.Info("Watch " + c.id + " successful!"), myfail);
         }
         else 
         {
            globals.api.Delete("watch", c.id, data => 
               log.Info("Remove watch " + c.id + " successful!"), myfail);
         }
      }
   });
}

function doCommentSearch(template, stemplate)
{
   var csearch = {
      "reverse" : stemplate.fields.reverse,
      "sort" : stemplate.fields.sort,
      "parentids" : [stemplate.fields.pageid]
   };

   if(stemplate.fields.searchvalue)
      csearch.contentlike = `%${stemplate.fields.searchvalue}%`;
   if(stemplate.fields.createstart)
      csearch.createstart = stemplate.fields.createstart;
   if(stemplate.fields.createend)
      csearch.createend = stemplate.fields.createend;
   if(stemplate.fields.searchids)
   {
      var match = stemplate.fields.searchids.match(/^(\d*)-(\d*)$/);
      if (match)
      {
         //+/-1 because frontend inclusive, backend exclusive
         if(match[1]) csearch.minid = Number(match[1]) - 1;
         if(match[2]) csearch.maxid = Number(match[2]) + 1;
      }
      else
      {
         csearch.ids = stemplate.fields.searchids.split(",").map(x=>Number(x));
      }
   }

   var params = new URLSearchParams();
   params.append("requests", "comment-" + JSON.stringify(csearch));
   params.append("requests", "user.0createUserId.0edituserId");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see dev log for page data", apidata);

      stemplate.fields.results.innerHTML = "";

      var singlecontainer = null;

      //The results look different if they're contiguous or not. The only
      //time they're NOT is when there's a search value. Later, it will
      //also be when users are limited, or sorting is weird.
      if(!csearch.contentlike)
      {
         singlecontainer = Templates.LoadHere("messagecontainer");
         stemplate.fields.results.appendChild(singlecontainer);
      }

      apidata.data.comment.forEach(cm =>
      {
         var container = singlecontainer || Templates.LoadHere("messagecontainer");

         var addresult = container.template.AddComment(
               cm, getLocalOption("breakchatmessagetime") * 1000);

         if(addresult)
         {
            addresult.fragment.template.SetFields({
               editfunc : messageControllerEvent
            });

            //Oh this is special, put some extra crap
            if(!singlecontainer)
            {
               stemplate.fields.results.appendChild(container);
               addresult.frame.template.fields.messagelist.appendChild(
                  Templates.LoadHere("commentsearchexpand", { comment : cm }));
               stemplate.fields.results.appendChild(Templates.LoadHere("messagedivider"));
            }
         }
      });

      template.fields.loading = false;
   });

   return csearch;
}

// *******************
// --- SPECIAL DOM ---
// *******************

//Set page state or whatever for the given key. It doesn't have to have
//changed, just call this whenever you want to set the state for the key
function handleSetting(key, value)
{
   if(key === "collapsechatinput")
      setExpandableTextbox(value);
   if(key === "theme")
      setTheme(value);
   if(key === "displaynotifications" && value)
   {
      var undosetting = () =>
      {
         setLocalOption("displaynotifications", false);
         refreshOptions();
         notifyError("No permission to display notifications, setting forced 'off'");
      };

      if(Notification.requestPermission)
      {
         Notification.requestPermission().then(permission =>
         {
            if(permission !== "granted")
               undosetting();
         });
      }
      else
      {
         undosetting();
      }
   }
}

function handleSearchResults(data)
{
   hide(searchpagesresults);
   hide(searchusersresults);
   hide(searchcategoriesresults);

   if(data == false)
   {
      hide(searchresultscontainer);
      return;
   }

   var total = 0;
   data.content = data.content || [];
   data.user = data.user || [];
   data.category = data.category || [];

   total = data.content.length + data.user.length + data.category.length;

   displaySearchResults(searchpagesresults, mapSearchContent(data.content));
   displaySearchResults(searchusersresults, mapSearchUser(data.user));
   displaySearchResults(searchcategoriesresults, mapSearchCategories(data.category));

   setHidden(nosearchresults, total);
   unhide(searchresultscontainer);
}

function quickLoad(spadat)
{
   if(getLocalOption("quickload"))
   {
      writeDom(() =>
      {
         log.Debug("Quick loading page, assuming format before we have all the data");

         //If it comes time for us to run the page init but the request that
         //spawned us already finished, well don't initialize!!
         if(globals.spahistory.some(x => x.rid === spadat.rid))
         {
            log.Warn("Tried to initialize page for quickload, but it already started!");
            return;
         }
         initializePage("quickload");
         unhide(maincontentloading);
         if(FrontendCoop.TypeHasDiscussion(spadat.page) && spadat.page !== "user")
         {
            showDiscussion(Number(spadat.id));
            formatRememberedDiscussion(spadat.id, true); //last doesn't matter, default to whatever
         }
      });
   }
}

function refreshOptions()
{
   writeDom(() =>
   {
      for(key in options)
      {
         options[key].value = getLocalOption(key);
         handleSetting(key, options[key].value);
      }
      renderOptions(options);
   });
}

function setFileUploadList(page, allImages, bucket)
{
   writeDom(() =>
   {
      fileuploaditems.innerHTML = "<div uk-spinner='ratio: 3'></div>";
      fileuploadthumbnails.innerHTML = "";
   });

   var fdl = getLocalOption("filedisplaylimit");
   var url = "file?reverse=true&limit=" + fdl + "&skip=" + (fdl * page);
      
   if(!allImages)
      url += "&createuserids=" + getUserId();
   if(bucket)
      url += "&bucket=" + encodeURIComponent(bucket);

   //Api.prototype.Generic = function(suburl, success, error, always, method, data, modify)
   globals.api.Generic(url, apidata =>
   {
      var files = apidata.data;
      fileuploadnewer.onclick = e => { e.preventDefault(); setFileUploadList(page - 1, allImages, bucket); }
      fileuploadolder.onclick = e => { e.preventDefault(); setFileUploadList(page + 1, allImages, bucket); }

      writeDom(() =>
      {
         fileuploaditems.innerHTML = "";
         for(var i = 0; i < files.length; i++)
            addFileUploadImage(files[i], i);

         setHidden(fileuploadnewer, page <= 0);
         setHidden(fileuploadolder, files.length !== fdl);
      });
   }, undefined, undefined, "GET");

   signals.Add("refreshfileupload", { 
      page: page, 
      all: allImages, 
      bucket : bucket 
   });
}

function addFileUploadImage(file, num)
{
   var fItem = cloneTemplate("fupmain");
   var fThumb = cloneTemplate("fupthumb");
   multiSwap(fItem, { 
      imgsrc: getComputedImageLink(file.id) 
   });
   multiSwap(fThumb, {
      imgsrc: getComputedImageLink(file.id, 60, true),
      number: num,
      fileid: file.id
   });
   fileuploaditems.appendChild(fItem);
   fileuploadthumbnails.appendChild(fThumb);
}

function updateCurrentUserData(user)
{
   writeDom(() =>
   {
      //Just username and avatar for now?
      website.setAttribute("data-issuper", user.super);
      navuseravatar.src = getAvatarLink(user.avatar, 40);
      navuseravatar.setAttribute("data-avatar", user.avatar);
      userusername.firstElementChild.textContent = user.username;
      userusername.setAttribute("data-username", user.username);
      userusername.href = Links.User(user.id);
      userid.textContent = "User ID: " + user.id;
      userid.setAttribute("data-userid", user.id);  //Can't use findSwap: it's an UPDATE
      finalizeTemplate(userusername); //be careful with this!
      //Check fields in user for certain special fields like email etc.
      signals.Add("updatecurrentuser", user);
   });
}

function formatRememberedDiscussion(cid, show, type)
{
   var fmt = "content"; //What are we doing with split mode?

   if(type==="chat")
      fmt = "discussion";
   // if(type==="documentation" || type==="program" || type==="tutorial"
   //    || type ==="resource")
   //    fmt = "content";

   formatDiscussions(show, getRememberedFormat(cid) || fmt);
}

function finishDiscussion(content, comments, initload)
{
   var d = getDiscussion(content.id);
   showDiscussion(content.id);
   easyComments(comments, initload);
   formatRememberedDiscussion(content.id, true, content.type);
   signals.Add("finishdiscussion", { content: content, comments: comments, initload: initload});
}

//This is actually required by index.html... oogh dependencies
function renderContent(elm, repl)
{
   if(repl)
   {
      elm.setAttribute("data-rawcontent", repl);
      elm.innerHTML = "";
      try
      {
         var content = JSON.parse(repl);
         elm.appendChild(Parse.parseLang(content.content, content.format));
      }
      catch(ex)
      {
         log.Warn("Couldn't parse content, rendering as-is: " + ex);
         elm.textContent = repl;
      }
   }

   return elm.getAttribute("data-rawcontent");
}

function makeActivity(modifySearch, finalize) //, unlimitedHeight)
{
   modifySearch = modifySearch || (x => x);
   var activity = cloneTemplate("history");
   var activityContainer = activity.querySelector(".historycontainer");
   var loadolder = activity.querySelector("[data-loadolder]");
   var loadloading = activity.querySelector("[data-loading]");
   var loadmore = activity.querySelector("[data-loadmore]");

   var searchAgain = function()
   {
      writeDom(() => unhide(loadloading));

      var initload = getLocalOption("activityload");
      var search = { reverse : true, limit: initload, includeanonymous: true };
      var lastItem = activityContainer.lastElementChild;

      if(lastItem) 
         search.maxid = Number(lastItem.template.fields.id); 

      search = modifySearch(search);

      var params = new URLSearchParams();

      params.append("requests", "activity-" + JSON.stringify(search));
      params.append("requests", "content.0contentId");
      params.append("requests", "category.0contentId");
      params.append("requests", "user.0contentId.0userId.1createUserId");
      params.set("content", "id,name,createUserId,type");
      params.set("category", "id,name");
      params.set("user", "id,username,avatar");

      globals.api.Chain(params, apidata =>
      {
         log.Datalog("check dev log for activity data", apidata);

         var data = apidata.data;
         var users = idMap(data.user);

         writeDom(() =>
         {
            hide(loadloading);
            setHidden(loadolder, data.activity.length !== initload);

            data.activity.filter(x => !(x.userId <= 0 && x.action == "c")).forEach(x => 
               activityContainer.appendChild(Templates.LoadHere("historyitem", {activity:x})));

            if(finalize)
               finalize(data.activity, activityContainer);
         });
      });
   };

   loadmore.onclick = function(event)
   {
      event.preventDefault();
      searchAgain();
   };

   searchAgain();

   return activity;
}

function makeCategorySelect(categories, name, includeRoot)
{
   var container = cloneTemplate("categoryselect");

   //var rc = Utilities.ShallowCopy(rootCategory);
   //rc.name = "Root";
   //categories.unshift(rc);

   //treeify(categories);

   fillTreeSelector(categories, container.querySelector("select"), includeRoot, "childCategories");
   hide(container.querySelector("[data-loading]"));
   //Update the value again since we didn't have options before
   multiSwap(container, {
      value: getSwap(container, "value"),
      name : name
   });

   finalizeTemplate(container);

   return container;
}

function makeMiniSearch(baseSearch, dataMap, onSelect, placeholder)
{
   var s = cloneTemplate("minisearch");
   placeholder = placeholder || "Search";

   findSwap(s, "placeholder", placeholder);
   finalizeTemplate(s);

   var input = s.querySelector("[data-search]");
   var results = s.querySelector("[data-results]");

   input.oninput = function(e)
   {
      let sv = input.value;

      setTimeout(function()
      {
         //Ignore strokes that weren't the last one
         if(sv === input.value)
         {
            if(sv)
            {
               baseSearch.value = sv;
               globals.api.Search(baseSearch, (data) =>
               {
                  displayMiniSearchResults(results, dataMap(data.data), x => onSelect(x));
               });
            }
            else
            {
               displayMiniSearchResults(results, []);
            }
         }
      }, getLocalOption("minisearchtimebuffer"));
   };

   return s;
}

function makeUserSearch(onSelect)
{
   return makeMiniSearch({search:{users:true}}, data => 
      data.user.map(x =>
      ({
         id : x.id,
         imageLink : getAvatarLink(x.avatar, 20),
         name : x.username,
         user : x
      })),
      onSelect, "Search Users");
}

function makeUserCollection(name, showperms, limit) //, container)
{
   var fragment = new DocumentFragment();
   var base = cloneTemplate("collection");
   var addpu = x => 
   {
      var existing = [...base.querySelectorAll("[data-collectionitem]")];

      while(limit && existing.length >= limit)
         Utilities.RemoveElement(existing.pop());

      addPermissionUser(x.user, base, showperms ? getLocalOption("defaultpermissions") : undefined);
   };
   fragment.appendChild(base);
   fragment.appendChild(makeUserSearch(addpu));
   if(showperms)
   {
      base.setAttribute("data-keys", "");
      var addeveryone = cloneTemplate("addeveryone");
      addeveryone.onclick = e =>
      {
         e.preventDefault();
         addpu({user:Utilities.ShallowCopy(everyoneUser)});
      };
      fragment.appendChild(addeveryone);
   }
   multiSwap(base, {
      name : name
   });
   finalizeTemplate(base);
   return fragment;
}

function addPermissionUser(user, list, permissions)
{
   if(!list.hasAttribute("data-collection"))
      list = list.querySelector("[data-collection]");
   var showperms = (permissions !== undefined);
   var permuser = makePermissionUser(
      user.avatar !== null ? getAvatarLink(user.avatar, 50) : null, user.username, 
      permissions, user.id === 0);
   list.appendChild(makeCollectionItem(permuser,
      x => showperms ? getSwap(x, "value") : user.id, 
      showperms ? String(user.id) : undefined));
}

function makeImageCollection(name)
{
   var fragment = new DocumentFragment();
   var base = cloneTemplate("collection");
   var select = Templates.LoadHere("imageselect", { selectimage : 
      () => { globals.fileselectcallback = id => addImageItem(id, base) }
   });
   //cloneTemplate("imageselect");
   //multiSwap(select, {
   //   action : () => { globals.fileselectcallback = id => addImageItem(id, base) }
   //});
   multiSwap(base, {
      name : name
   });
   base.setAttribute('data-condense', "true");
   finalizeTemplate(base);
   finalizeTemplate(select);
   //var addimg = x => addImageItem(x.user, base, 
   //   showperms ? getLocalOption("defaultpermissions") : undefined);
   fragment.appendChild(base);
   fragment.appendChild(select);
   return fragment;
}

function addImageItem(id, list)
{
   if(!list.hasAttribute("data-collection"))
      list = list.querySelector("[data-collection]");
   var img = cloneTemplate("imageitem");
   multiSwap(img, {
      src : getComputedImageLink(id, 200),
      id : id
   });
   finalizeTemplate(img);
   list.appendChild(makeCollectionItem(img, x => id, undefined, true));
}

function makeAnnotatedSlideshowItem(content)
{
   var tmp = cloneTemplate("annotatedslideshowitem");
   multiSwap(tmp, {
      link: Links.Page(content.id),
      title: content.name,
      tagline: content.values.tagline,
      src: getContentImageLink(content)
   });
   finalizeTemplate(tmp);
   return tmp;
}

function fillSlideshow(slideshow, content)
{
   content.values.photos.split(",").filter(x => x).forEach(x =>
   {
      var tmp = cloneTemplate("slideshowitem");
      multiSwap(tmp, {
         src: getComputedImageLink(x)
      });
      finalizeTemplate(tmp);
      slideshow.appendChild(tmp);
   });
}

// *********************
// --- NOTIFICATIONS ---
// *********************

function notifyBase(message, icon, status)
{
   UIkit.notification({
      "message": "<span class='uk-flex uk-flex-middle'><span uk-icon='icon: " +
         icon + "; ratio: 1.4' class='uk-flex-none uk-text-" + status + 
         "'></span><span class=" +
         "'uk-width-expand uk-text-break notification-actual'>" + 
         message + "</span></span>", 
      "pos":"bottom-right",
      "timeout": Math.floor(getLocalOption("notificationtimeout") * 1000)
   });
}

function notifyError(error)
{
   log.Error(error);
   notifyBase(error, "close", "danger");
}

function notifySuccess(message)
{
   log.Info("Notify: " + message);
   notifyBase(message, "check", "success");
}

function displayRaw(title, raw)
{
   rawmodaltitle.textContent = title;
   rawmodalraw.textContent = raw;
   UIkit.modal(rawmodal).show();
}

function displayPreview(title, rawcontent, format)
{
   previewmodaltitle.textContent = title;
   previewmodalpreview.innerHTML = "";
   previewmodalpreview.appendChild(Parse.parseLang(rawcontent, format));
   UIkit.modal(previewmodal).show();
}

function handleAlerts(comments, users)
{
   //Figure out the comment that will go in the header
   if(!comments)
      return;
   
   var tdo = getLocalOption("titlenotifications");
   var ndo = Notification.permission === "granted" && getLocalOption("displaynotifications");

   if(ndo || (tdo != "none"))
   {
      var alertids = getWatchLastIds();
      var activedisc = getActiveDiscussionId();

      //Add our current room ONLY if it's invisible (and we're in ndo)
      if(!document.hidden && ndo) //Document is visible, NEVER alert the current room
         delete alertids[activedisc];
      else if(!alertids[activedisc]) //Document is invisible, alert IF it's not already in the list
         alertids[activedisc] = 0;

      var cms = sortById(comments).filter(x => alertids[x.parentId] < x.id &&
         x.editDate === x.createDate); //NO COMMENTS

      try
      {
         cms.forEach(x => 
         {
            var parsed = FrontendCoop.ParseComment(x.content);
            //this may be dangerous
            if(ndo)
            {
               var pw = document.getElementById(getPulseId(x.parentId));
               var name = getSwap(pw, "pwname");
               var notification = new Notification(Templates._chatDisplayName(parsed, users[x.createUserId].username) + ": " + name, {
                  tag : "comment" + x.id,
                  body : parsed.t,
                  icon : getAvatarLink(parsed.a ||  users[x.createUserId].avatar, 100),
               });
            }
            if(tdo == "all" || (tdo == "currentpage" && x.parentId == getActiveDiscussionId()))
            {
               document.head.querySelector("link[data-favicon]").href = getAvatarLink(
                  parsed.a || users[x.createUserId].avatar, 40);
               document.title = parsed.t;
            }
         });
      }
      catch(ex)
      {
         log.Error("Could not send notification: " + ex);
      }
   }
}

function handleLongpollData(lpdata)
{
   var data = lpdata.data;

   if(data)
   {
      var users = idMap(data.chains.user);
      var watchlastids = getWatchLastIds();
      writeDom(() => updatePulse(data.chains));

      if(data.chains.comment)
      {
         //I filter out comments from watch updates if we're currently in
         //the room. This should be done automatically somewhere else... mmm
         data.chains.commentaggregate = DataFormat.CommentsToAggregate(
            data.chains.comment.filter(x => x.id > watchlastids[x.parentId]));
         lpdata.clearNotifications.forEach(x => 
            data.chains.commentaggregate.forEach(y => 
            {
               if(y.id == x)
                  y.count = 0;
            })
         );
            //&& lpdata.clearNotifications.indexOf(x.parentId) < 0));
         handleAlerts(data.chains.comment, users);
         writeDom(() => easyComments(data.chains.comment)); //users));
      }

      if(data.chains.modulemessage)
      {
         data.chains.modulemessage.forEach(x =>
         {
            //var msg = x.message;
            for(var j = 0; j < data.chains.user.length; j++)
               x.message = x.message.replace(new RegExp("%" + data.chains.user[j].id + "%","g"), data.chains.user[j].username);
            CommandSystem.message(x);
         });
      }

      if(data.chains.activity)
      {
         data.chains.activityaggregate = DataFormat.ActivityToAggregate(
            data.chains.activity.filter(x => watchlastids[x.contentId] < x.id &&
               lpdata.clearNotifications.indexOf(x.contentId) < 0));
      }

      log.Datalog("see devlog for watchlastids", watchlastids);
      log.Datalog("see devlog for raw chat data", data);

      writeDom(() => 
      {
         updateWatches(data.chains);

         if(data.listeners)
            updateDiscussionUserlist(data.listeners, users);
      });
   }
}

// ***************************
// ---- GENERAL UTILITIES ----
// ***************************

//Note: cascading dom writes should USUALLY be handled in the same frame UNLESS
//there's something in the middle that's deferred (time set)
function writeDom(func) { signals.Add("wdom", func); }

function login(token) { setToken(token); location.reload(); }
function logout() { setToken(null); location.reload(); }

function localOptionKey(key) { return "localsetting_" + key; }

function getLocalOption(key)
{
   var val = localStorage.getItem(localOptionKey(key));
   if(val === null || val === undefined)
      return options[key].def;
   else
      return JSON.parse(val);
}

function setLocalOption(key, value)
{
   log.Info("Setting " + key + " to " + value);
   localStorage.setItem(localOptionKey(key), JSON.stringify(value));
   signals.Add("setlocaloption", { key : key, value : value });
}

function clearLocalOption(key)
{
   log.Info("Clearing option " + key);
   localStorage.removeItem(localOptionKey(key));
   signals.Add("clearlocaloption", { key : key, value : getLocalOption(key) });
}

function setLocalOptions(newoptions)
{
   for(key in newoptions)
   {
      try
      {
         if(key in options)
            setLocalOption(key, newoptions[key]);
         else
            log.Warn(`Skipping load setting ${key}: not a setting key`);
      }
      catch(ex)
      {
         log.Error(ex);
      }
   }
}

function getToken()
{
   var token = window.localStorage.getItem("usertoken");
   if(!token) return undefined;
   return JSON.parse(token);
}

function setToken(token)
{
   if(token)
      token = JSON.stringify(token);
   window.localStorage.setItem("usertoken", token);
}

function getComputedImageLink(id, size, crop, ignoreRatio)
{
   if(size)
   {
      size = Math.max(10, Math.floor(size * getLocalOption("imageresolution") * 
            (ignoreRatio ? 1 : window.devicePixelRatio))); 
   }

   return globals.api.Image(id, size, crop, (size || crop) && getLocalOption("animatedavatars") == "none");
}

function getAvatarLink(id, size, ignoreRatio) 
{ 
   return getComputedImageLink(id, size, true, ignoreRatio); 
}

function getContentThumbnailLink(content, size, crop, ignoreRatio)
{
   return (content.values && content.values.thumbnail) ? 
      getComputedImageLink(content.values.thumbnail, size, crop, ignoreRatio) : null;
}

function getContentImageLink(content, size, crop, ignoreRatio)
{
   var images = (content.values.photos || "").split(",");
   return images[0] ? getComputedImageLink(images[0], size, crop, ignoreRatio) : null;
}

function getRememberedFormat(cid) {
   return localStorage.getItem("halfe-fmt" + cid);
}

function setRememberedFormat(cid, type) {
   localStorage.setItem("halfe-fmt" + cid, type);
}

function idMap(data)
{
   data = data || [];
   var ds = {};
   for(var i = 0; i < data.length; i++)
      ds[data[i].id] = data[i];
   return ds;
}

function sortById(a)
{
   return a.sort((x,y) => Math.sign(x.id - y.id));
}

function getChain(categories, content)
{
   //work backwards until there's no parent id
   var crumbs = [ content ];
   var cs = idMap(categories);

   while(crumbs[0].parentId)
      crumbs.unshift(cs[crumbs[0].parentId]);

   if(!crumbs.some(x => x.id === 0))
      crumbs = [{"name":"Root","id":0}].concat(crumbs);

   return crumbs;
}

function isPageLoading()
{
   //This means there is an in-flight request if there are no history items
   //with the final request id that was generated
   return !globals.spahistory.some(x => x.rid === globals.spa.requestId);
}

// ***********************
// ---- TEMPLATE CRAP ----
// ***********************

function makePWUser(user)
{
   var pu = cloneTemplate("pwuser");
   pu.setAttribute("data-pwuser", user.id);
   multiSwap(pu, {
      userlink: Links.User(user.id)
   });
   UIkit.util.on(pu.querySelector("[uk-dropdown]"), 'beforeshow', 
      e => refreshPulseUserDisplay(e.target));
   finalizeTemplate(pu);
   return pu;
}


//-------------------------------------------------
// ***********************************************
// ***********************************************
// ***********************************************
//    --- ALREADY HANDLED ABOVE THIS POINT ---
// ***********************************************
// ***********************************************
// ***********************************************
//-------------------------------------------------





//Set up the page and perform initial requests for being "logged in"
function setupSession()
{
   var loggedIn = getToken() ? true : false;
   var params = new URLSearchParams();
   params.append("requests", "category"); //there may be other things you load at the start

   //Don't do this special crap until everything is setup, SOME setup may not
   //be required before the user session is started, but it's minimal savings.
   if(loggedIn)
   {
      log.Info("User token found, trying to continue logged in");

      writeDom(() => 
      {
         unhide(rightpaneactivityloading);
         unhide(rightpanewatchesloading);
      });

      //because of current nature of login, we can set the login state to true
      //right now. TODO: fix all this refreshUser and session stuff.
      writeDom(() => setLoginState("true"));
      //Refreshing will set our login state, don't worry about that stuff.
      refreshUserFull(); 

      var search = {"reverse":true,"createstart":Utilities.SubHours(getLocalOption("pulsepasthours")).toISOString()};
      var watchsearch = {"ContentLimit":{"Watches":true}};
      params.append("requests", "systemaggregate"); //1
      params.append("requests", "comment-" + JSON.stringify(search));   //2
      params.append("requests", "activity-" + JSON.stringify(search));  //3
      params.append("requests", "watch");    //4
      params.append("requests", "commentaggregate-" + JSON.stringify(watchsearch)); //5
      params.append("requests", "activityaggregate-" + JSON.stringify(watchsearch)); //6
      params.append("requests", "content.3contentId.2parentId.4contentId"); //7
      params.append("requests", "user.3userId.2createUserId.5userIds.6userIds.7createUserId"); //8
      params.set("comment","id,parentId,createUserId,createDate");
      params.set("content","id,name,type,values,createUserId,permissions");
      params.set("user","id,username,avatar,super,createDate");
      params.set("watch","id,contentId,lastNotificationId");
   }

   globals.api.Chain(params, apidata =>
   {
      var data = apidata.data;

      if(loggedIn)
      {
         data.systemaggregate.forEach(x => 
         {
            if(x.type === "actionMax")
            {
               log.Info("Last system id: " + x.id);
               globals.lastsystemid = x.id;

               if(getLocalOption("forcediscussionoutofdate"))
                  globals.lastsystemid -= 2000;

               tryUpdateLongPoll();
            }
         });

         writeDom(() => 
         {
            hide(rightpaneactivityloading);
            hide(rightpanewatchesloading);
         });

         //Fully stock (with reset) the sidepanel
         updatePulse(data, true);
         updateWatches(data, true);
      }

      setPaneCategoryTree(apidata.data.category)
   });
}


function refreshUserFull(always)
{
   //Make an API call to /me to get the latest data.
   globals.api.Get("user/me", "", function(apidata)
   {
      updateCurrentUserData(apidata.data);
      //Don't set up the FULL session, you know? Someone else will do that
      writeDom(() => setLoginState("true"));
   }, function(apidata)
   {
      //Assume any failed user refresh means they're logged out
      log.Error("Couldn't refresh user, deleting cached token");
      logout();
   }, undefined, always);
}

function updateDiscussionUserlist(listeners, users)
{
   var list = listeners ? listeners[getActiveDiscussionId()] : {};

   for(key in list)
   {
      let uid = key;
      var existing = discussionuserlist.querySelector('[data-uid="' + uid + '"]');
      var avatar = getAvatarLink(users[uid].avatar, 40);

      if(!existing)
      {
         var tmpl = Templates.Load("discussionuser");
         existing = tmpl.element;
         existing.setAttribute("data-uid", uid);
         discussionuserlist.appendChild(existing);
      }

      existing.setAttribute("data-status", list[uid]);
      existing.template.fields.user = users[uid]; 
   }

   [...discussionuserlist.querySelectorAll("[data-uid]")].forEach(x => 
   {
      if(!list[x.getAttribute("data-uid")])
         Utilities.RemoveElement(x);
   });
}

function getUserId() { return Number(userid.dataset.userid); }
function getUsername() { return userusername.dataset.username; }
function getUserAvatar() { return Number(navuseravatar.dataset.avatar); }
function getIsSuper() { return website.getAttribute("data-issuper") == "true"; }

function formError(form, error)
{
   writeDom(() => form.appendChild(Templates.LoadHere("notifyelement_error",{message:error})));
   log.Error(error);
}

function formSetupSubmit(form, endpoint, success, validate, baseData)
{
   form.addEventListener("submit", function(event)
   {
      event.preventDefault();
      formStart(form);

      var formData = formSerialize(form, baseData);
      if(validate) 
      {
         var error = validate(formData);
         if(error) 
         { 
            formError(form, error); 
            formEnd(form);
            return; 
         }
      }

      var func = globals.api.Post.bind(globals.api);
      //var data = formData;

      if(baseData)
      {
         func = globals.api.Put.bind(globals.api);
         //data = Utilities.MergeInto(baseData, formData);
         endpoint += "/" + baseData.id;
      }

      func(endpoint, formData, apidata => success(apidata.data),
         apidata => formError(form, apidata.request.responseText || apidata.request.status), 
         apidata => formEnd(form));
   });
}


function setupWatchClear(parent, cid)
{
   let watchLink = parent.querySelector("[data-clearcount]");
   let watchAlert = parent.querySelector("[data-pwcount]");

   watchLink.onclick = function(event)
   {
      event.preventDefault();

      watchAlert.className = watchAlert.className.replace(/danger/g, "warning");

      if(getLocalOption("generaltoast"))
         notifyBase("Clearing notifications for '" + getSwap(parent, "data-pwname") + "'");

      globals.api.WatchClear(cid, apidata =>
      {
         log.Info("Clear watch " + cid + " successful!");
      }, apidata =>
      {
         notifyError("Failed to clear watches for cid " + cid);
      }, apidata => //Always
      {
         watchAlert.className = watchAlert.className.replace(/warning/g, "danger");
      });
   };
}




// *********************
// ---- P/W General ----
// *********************

function refreshPWDate(item)
{
   var timeattr = item.getAttribute(attr.pulsedate);
   var message;

   if(!timeattr || timeattr === "0")
   {
      message = "";
   }
   else
   {
      message = Utilities.TimeDiff(timeattr, null, true);

      if(message.toLowerCase().indexOf("now") < 0)
         message += " ago";
   }

   var oldmsg = getSwap(item, "pwtime");

   if(oldmsg != message)
      findSwap(item, "pwtime", message);
}

function refreshPWDates(parent) 
{ 
   //A UIkit optimization: it's fine if dates are a little "out of date" when
   //you first return to the page. the event will fire eventually.
   //if(!document.hidden)
   [...parent.children].forEach(x => refreshPWDate(x)); 
}

function updatePWContent(pulsedata, c)
{
   //Update the content name now, might as well
   multiSwap(pulsedata, {
      pwname : c.name
   });
   thumbType(c, pulsedata);
}

function thumbType(page, element)
{
   var th = getContentThumbnailLink(page, 20, true);
   var swap = { "type" : false, "image" : false, "private" : false }; //{ "type" : null };
   if (th) 
      swap.image = th;
   else
      swap.type = page.type;
   if(!page.permissions["0"] || page.permissions["0"].toLowerCase().indexOf("r") < 0)
      swap.private = true;
   multiSwap(element, swap);
}

function easyPWContent(c, id, parent)
{
   var pulsedata = document.getElementById(id);

   if(!pulsedata)
   {
      pulsedata = cloneTemplate("pw");
      pulsedata.id = id;
      multiSwap(pulsedata, {
         pwlink: Links.Page(c.id),
         contentid : c.id
      });
      parent.appendChild(finalizeTemplate(pulsedata));
   }

   updatePWContent(pulsedata, c);

   return pulsedata;
}

function easyPWUser(u, parent)
{
   var pulseuser = parent.querySelector('[data-pwuser="' + u.id + '"]');

   if(!pulseuser)
   {
      pulseuser = makePWUser(u);
      getPWUserlist(parent).appendChild(pulseuser);
   }

   multiSwap(pulseuser, {
      useravatar: getComputedImageLink(u.avatar, 40, true),
      username: u.username
   });

   return pulseuser;
}

// ***************
// ---- Pulse ----
// ***************


var pulseUserFields = [ "create", "edit", "comment" ];

function getPulseUserData(userElem)
{
   var result = {};

   for(var i = 0; i < pulseUserFields.length; i++)
   {
      var elem = userElem.querySelector("[data-" + pulseUserFields[i] + "]");
      result[pulseUserFields[i]] = {
         count : Number(elem.getAttribute("data-count")),
         lastdate : elem.getAttribute("data-lastdate"),
         firstdate : elem.getAttribute("data-firstdate")
      };
   }

   return result;
}

function setPulseUserData(userElem, data)
{
   var maxparentdate=userElem.getAttribute(attr.pulsedate) || "0";
   for(var i = 0; i < pulseUserFields.length; i++)
   {
      var elem = userElem.querySelector("[data-" + pulseUserFields[i] + "]");
      var d = data[pulseUserFields[i]];
      elem.setAttribute("data-count", d.count);
      elem.setAttribute("data-lastdate", d.lastdate);
      elem.setAttribute("data-firstdate", d.firstdate);
      if(d.lastdate > maxparentdate) maxparentdate=d.lastdate;
      if(d.firstdate > maxparentdate) maxparentdate=d.firstdate;
   }
   userElem.setAttribute(attr.pulsedate, maxparentdate);
}

function refreshPulseUserDisplay(userElem)
{
   var data = getPulseUserData(userElem); 
   var parent = false;
   for(var i = 0; i < pulseUserFields.length; i++)
   {
      var elem = userElem.querySelector("[data-" + pulseUserFields[i] + "]");
      if(!parent) parent = elem.parentNode;
      var d = data[pulseUserFields[i]];
      if(d && d.count)
      {
         elem.querySelector("td:first-child").textContent = d.count; 
         var dtmsg = [];
         if(d.lastdate) dtmsg.push(Utilities.TimeDiff(d.lastdate, null, true));
         if(d.firstdate) dtmsg.push(Utilities.TimeDiff(d.firstdate, null, true));
         elem.querySelector("td:last-child").textContent = dtmsg.join(" - ");
         elem.style = "";
      }
      else
      {
         elem.style.display = "none";
      }
   }
   Utilities.SortElements(parent, 
   //specialSort(parent, 
      x => x.getAttribute("data-lastdate") || x.getAttribute("data-firstdate") || "0", 
      true);
}

function cataloguePulse(c, u, aggregate)
{
   //Oops, never categorized this content
   if(!aggregate[c.id])
      aggregate[c.id] = { pulse: easyPWContent(c, getPulseId(c.id), pulse) };

   //Oops, never categorized this user IN this content
   if(!aggregate[c.id][u.id])
   {
      var pulseuser = easyPWUser(u, aggregate[c.id].pulse);

      aggregate[c.id][u.id] = getPulseUserData(pulseuser);
      aggregate[c.id][u.id].user = pulseuser;
   }

   return aggregate[c.id][u.id];
}

function applyPulseCatalogue(aggregate)
{
   for(key in aggregate)
   {
      if(Number(key))
      {
         for(key2 in aggregate[key])
            if(Number(key2))
               setPulseUserData(aggregate[key][key2].user, aggregate[key][key2]);

         //Sort userlist since we know exactly which contents we updated, we
         //don't want to sort EVERYTHING (think updates to only a single item
         //in the list)
         var pulseuserlist = getPWUserlist(aggregate[key].pulse);
         Utilities.SortElements(pulseuserlist,
         //specialSort(pulseuserlist,
            x => x.getAttribute(attr.pulsedate) || "0", true);

         //Now update the maxdate on overall content
         aggregate[key].pulse.setAttribute(attr.pulsedate,
            pulseuserlist.firstElementChild.getAttribute(attr.pulsedate));
      }
   }
}

function updatePulseCatalogue(item, date)
{
   item.count++;

   if(item.count === 1) 
   {
      item.firstdate = date;
      return;
   }
   else if(item.count === 2) 
   {
      item.lastdate = date;
   }

   var lt = new Date(item.lastdate).getTime();
   var ft = new Date(item.firstdate).getTime();
   var dt = new Date(date).getTime();

   if(lt < ft)
   {
      var t = item.lastdate;
      item.lastdate = item.firstdate;
      item.firstdate = t;
   }

   if(dt > lt)
      item.lastdate = date;
   if(dt < ft)
      item.firstdate = date;
}

function updatePulse(data, fullReset)
{
   if(fullReset)
      pulse.innerHTML = "";

   //Easy dictionaries
   var users = idMap(data.user);
   var contents = idMap(data.content);
   var aggregate = {};

   if(data.comment)
   {
      for(var i = 0; i < data.comment.length; i++)
      {
         var c = data.comment[i];
         var ct = contents[c.parentId];
         if(c.createUserId && ct) //need to check in case deleted comment or deleted content
         {
            var d = cataloguePulse(ct, users[c.createUserId], aggregate);
            updatePulseCatalogue(d.comment, c.createDate);
         }
      }
   }

   if(data.activity)
   {
      for(var i = 0; i < data.activity.length; i++)
      {
         var a = data.activity[i];
         var ct = contents[a.contentId];
         //Activity type is broken, needs to be fixed. This check is a temporary stopgap
         //Also, you COULD get activity for content that doesn't exist anymore,
         //maybe it was deleted? We don't care about deleted content in pulse
         if(a.userId > 0 && a.type==="content" && ct) //need to check in case system
         {
            var d = cataloguePulse(contents[a.contentId], users[a.userId], aggregate);

            if(a.action == "c")
               updatePulseCatalogue(d.create, a.date);
            else if(a.action == "u")
               updatePulseCatalogue(d.edit, a.date);
         }
      }
   }

   applyPulseCatalogue(aggregate);

   Utilities.SortElements(pulse,
   //specialSort(pulse,
      x => x.getAttribute(attr.pulsedate) || "0", true);

   refreshPWDates(pulse);
}


// ***************
// ---- Watch ----
// ***************

function getWatchLastIds()
{
   var result = {};
   [...watches.querySelectorAll("[data-pw]")].forEach(x =>
   {
      result[Number(getSwap(x, "contentid"))] =
         Number(x.getAttribute(attr.pulsemaxid));
   });
   return result;
}

function updateWatchGlobalAlert()
{
   var counts = watches.querySelectorAll("[data-pw]"); 
   var sum = 0;
   [...counts].forEach(x => sum += (Number(getSwap(x, attr.pulsecount)) || 0));
   watchglobalalert.textContent = sum ? String(sum) : "";
}

function updateWatchSingletons(data)
{
   updateWatchComAct(idMap(data.user), 
      idMap(DataFormat.CommentsToAggregate(data.comment)), 
      idMap(DataFormat.ActivityToAggregate(data.activity)));
}

function updateWatchComAct(users, comments, activity)
{
   [...new Set(Object.keys(comments).concat(Object.keys(activity)))].forEach(cid =>
   {
      var watchdata = document.getElementById(getWatchId(cid)); 

      if(watchdata)
      {
         if(getActiveDiscussionId() == cid && comments[cid])
         {
            //log.Warn("SETTING NEW MAXID TO: " + comments[cid].lastId);
            watchdata.setAttribute(attr.pulsemaxid, comments[cid].lastId);
         }

         var total = Number(getSwap(watchdata, attr.pulsecount) || "0");
         var maxDate = watchdata.getAttribute(attr.pulsedate) || "0";

         var upd = function(t)
         {
            if(t)
            {
               for(var i = 0; i < t.userIds.length; i++)
                  if(t.userIds[i] !== 0)
                     easyPWUser(users[t.userIds[i]], watchdata);

               total += t.count;

               if(t.lastDate > maxDate)
                  maxDate = t.lastDate;
            }
         };

         upd(comments[cid]);
         upd(activity[cid]);

         if(total)
            findSwap(watchdata, attr.pulsecount, total);

         if(maxDate === "0")
            watchdata.removeAttribute(attr.pulsedate);
         else
            watchdata.setAttribute(attr.pulsedate, maxDate);
      }
   });

   writeDom(() =>
   {
      Utilities.SortElements(watches,
         x => x.getAttribute(attr.pulsedate) || ("0" + x.getAttribute(attr.pulsemaxid) + 
                x.getAttribute("data-cid")), true);

      refreshPWDates(watches);

      updateWatchGlobalAlert();
      updateGlobalAlert();
   });
}

function updateWatches(data, fullReset)
{
   if(fullReset)
      watches.innerHTML = "";

   var users = idMap(data.user);
   var contents = idMap(data.content);
   var comments = idMap(data.commentaggregate);
   var activity = idMap(data.activityaggregate);

   if(data.watch)
   {
      for(var i = 0; i < data.watch.length; i++)
      {
         var c = contents[data.watch[i].contentId];
         if(!c) continue; //you CAN have items in your watchlist that have no associated content...
         var watchdata = easyPWContent(c, getWatchId(c.id), watches);
         setupWatchClear(watchdata, c.id);
         watchdata.setAttribute(attr.pulsemaxid, data.watch[i].lastNotificationId);
      }
   }

   if(data.content)
   {
      data.content.forEach(x =>
      {
         var w = document.getElementById(getWatchId(x.id));
         if(w) updatePWContent(w, x);
      });
   }

   if(data.watchdelete)
   {
      writeDom(() =>
      {
         for(var i = 0; i < data.watchdelete.length; i++)
         {
            var w = document.getElementById(getWatchId(data.watchdelete[i].contentId));
            if(w) Utilities.RemoveElement(w);
         }
      });
   }

   //Note that because this happens before adding, if a clear comes WITH
   //comments, the comments will be added on top of the clear. That's probably
   //fine, but may not reflect reality. It's hard to say, depends on the API
   if(data.watchupdate) //ALL of these are assumed to be clears right now!!
   {
      writeDom(() =>
      {
         for(var i = 0; i < data.watchupdate.length; i++)
            clearWatchVisual(data.watchupdate[i].contentId);
      });
   }

   updateWatchComAct(users, comments, activity);
}

function clearWatchVisual(contentId)
{
   var w = document.getElementById(getWatchId(contentId));

   if(w) 
   {
      getPWUserlist(w).innerHTML = "";
      findSwap(w, attr.pulsecount, "");
      w.removeAttribute(attr.pulsedate);

      refreshPWDate(w);

      //Eventually fix this!
      updateWatchGlobalAlert();
      updateGlobalAlert();
   }
}


// ********************
// ---- Discussion ----
// ********************

//function loadOlderCommentsActive()
//{
//   if(!globals.loadingOlderDiscussions && 
//      globals.loadingOlderDiscussionsTime < performance.now() - 
//      getLocalOption("scrolldiscloadcooldown"))
//   {
//      var activeDiscussion = getActiveDiscussion();
//
//      if(!activeDiscussion.hasAttribute(attr.atoldest))
//         loadOlderComments(activeDiscussion);
//   }
//}
//

function getFragmentFrame(element)
{
   return Utilities.FindParent(element, x => x.getAttribute("data-template") == "messageframe");
}

function easyComments(comments, expected)
{
   if(comments && comments.length)
   {
      var n = performance.now();
      globals.commentsrendered = (globals.commentsrendered || 0) + comments.length;
      sortById(comments).forEach(x => easyComment(x));

      if(expected)
      {
         var d = getDiscussion(comments[0].parentId);
         d.template.fields.hasmorecomments = comments.length == expected;
      }

      log.PerformanceLog("easyComments(" + comments.length + "," + globals.commentsrendered + "): " + 
         (performance.now() - n) + "ms");
   }
}

function easyComment(comment)
{
   //First, find existing comment. If it's there, just update information?
   var existing = document.getElementById(getCommentId(comment.id));

   //Do different things depending on if it's an edit or not.
   if(existing)
   {
      if(comment.deleted)
      {
         log.Debug("Removing comment " + comment.id);
         var prnt = Utilities.RemoveElement(existing); 

         if(!prnt.firstElementChild)
         {
            log.Debug("Message frame containing comment " + comment.id + " empty, removing frame");
            Utilities.RemoveElement(getFragmentFrame(prnt));
         }
      }
      else
      {
         log.Debug("Editing comment " + comment.id)
         existing.template.SetFields({ message : comment });
      }
   }
   else
   {
      //Comment was never added but we're getting a delete message? Ignore it
      if(comment.deleted)
      {
         log.Warn("Ignoring comment delete: " + comment.id);
         return;
      }

      var d = getDiscussion(comment.parentId);
      var result = d.template.innerTemplates.messagecontainer.AddComment(
         comment, getLocalOption("breakchatmessagetime") * 1000);

      if(result)
      {
         d.template.fields.hascomments = true;

         result.fragment.template.SetFields({
            editfunc : messageControllerEvent
         });

         result.fragment.id = getCommentId(comment.id);
      }
   }
}

function messageControllerEvent(event)
{
   event.preventDefault();

   var omsg = Utilities.FindParent(event.target, x => x.getAttribute("data-template") == "messagefragment");
   var msg = omsg.template.fields.message;

   var frame = Templates.LoadHere("messageframe", { message : msg } ); 
   var fragment = Templates.LoadHere("messagefragment", { message : msg, frame : frame } ); 

   var msglist = frame.template.fields.messagelist;
   msglist.appendChild(fragment);
   Utilities.RemoveElement(fragment.querySelector(".messagecontrol"));

   commenteditpreview.innerHTML = "";
   commenteditpreview.appendChild(frame);

   var parsedcm = FrontendCoop.ParseComment(msg.content);
   commentedittext.value = parsedcm.t;
   commenteditformat.value = parsedcm.m;
   commenteditinfo.textContent = "ID: " + msg.id + "  UID: " + msg.createUserId;
   //var commenteditavatar = parsedcm.a;
   if(msg.createDate !== msg.editDate) 
      commenteditinfo.textContent += "  Edited: " + (new Date(msg.editDate)).toLocaleString();

   var getEditorComment = () => 
      FrontendCoop.CreateComment(commentedittext.value, commenteditformat.value, parsedcm.a);

   if(getUserId() != msg.createUserId && !getIsSuper())
   {
      hide(commenteditdelete);
      hide(commenteditedit);
   }
   else
   {
      unhide(commenteditdelete);
      unhide(commenteditedit);
      commenteditdelete.onclick = function() 
      { 
         if(confirm("Are you SURE you want to delete this comment?"))
         {
            globals.api.Post("comment/" + msg.id + "/delete", {},
               x => { if(getLocalOption("generaltoast")) notifySuccess("Comment deleted"); },
               x => notifyError("Couldn't delete comment: " + x.request.status + " - " + x.request.statusText));
               UIkit.modal(commentedit).hide();
         }
      };

      commenteditedit.onclick = function() 
      { 
         globals.api.Put("comment/" + msg.id, 
            {parentId : Number(getActiveDiscussionId()), 
               content: getEditorComment()},
               x => { if(getLocalOption("generaltoast")) notifySuccess("Comment edited"); },
               x => notifyError("Couldn't edit comment: " + x.request.status + " - " + x.request.statusText));
               UIkit.modal(commentedit).hide();
      };
   }

   commenteditshowpreview.onclick = function() 
   { 
      fragment.template.SetFields({content : getEditorComment()});
   };

   UIkit.modal(commentedit).show();
}

function tryUpdateLongPoll(newStatuses)
{
   if(newStatuses)
   {
      if(globals.statuses && Utilities.ShallowEqual(newStatuses, globals.statuses))
      {
         log.Warn("No new statuses when updating long poll, ignoring");
         return;
      }
      globals.statuses = newStatuses;
   }

   if(globals.lastsystemid && globals.statuses)
   {
      globals.longpoller.Update(globals.lastsystemid, globals.statuses);

      //TODO: move this to a signal perhaps?
      writeDom(() =>
      {
         Object.keys(globals.statuses).forEach(x =>
         {
            clearWatchVisual(x);
         });
      });
   }
}

function mapSearchContent(content, imgsize)
{
   imgsize = imgsize || 20;
   return content.map(x =>
   ({
      type : x.type,
      imageLink : getContentThumbnailLink(x, imgsize, true),
      link : Links.Page(x.id),
      title : x.name,
      meta : (new Date(x.createDate)).toLocaleDateString()
   }));
}
function mapSearchUser(users, imgsize)
{
   imgsize = imgsize || 20;
   return users.map(x =>
   ({
      imageLink : getAvatarLink(x.avatar, imgsize),
      link : Links.User(x.id),
      title : x.username,
      meta : (new Date(x.createDate)).toLocaleDateString()
   }));
}
function mapSearchCategories(categories, imgsize)
{
   imgsize = imgsize || 20;
   return categories.map(x =>
   ({
      type : "category",
      link : Links.Category(x.id),
      title : x.name,
      meta : (new Date(x.createDate)).toLocaleDateString()
   }));
}

function makeCategoryTreeView(tree)
{
   var fragment = new DocumentFragment();   
   var rootNodes = tree.filter(x => x.id === 0);
      //root nodes go in the top
      //x.subtree = fragment;
   rootNodes.forEach(x => recurseTreeSelector(x, (node, path, level) =>
   {
      var parent = path[path.length - 2];
      var subtree = parent ? parent.subtree : fragment;
      var nelm = cloneTemplate("categorytreenode");
      multiSwap(nelm, {
         categorylink : Links.Category(node.id),
         category : node.name
      });
      node.subtree = nelm.querySelector("[data-nodelist]");
      finalizeTemplate(nelm);
      subtree.appendChild(nelm);
   }, undefined, undefined, "childCategories"));
   return fragment;
}

function setPaneCategoryTree(categories)
{
   rightpanecategorytree.innerHTML = "";
   rightpanecategorytree.appendChild(makeCategoryTreeView(categories));
}

//A 12me thing for the renderer
var Nav = {
   replacements : { 
      "/": "-", //Replace the first / with - (will deeper paths work...?)
      "?": "&", //Replace the first ? with &
      "pages" : "page", //Want some plurals to go to non-plural
      "users" : "user", 
      "categories" : "category"
   },
   link: function(path, element) {
      var a = cloneTemplate("sbslink");
      var p = path; // why do we have a copy? IDK
      Object.keys(Nav.replacements).forEach(x => p = p.replace(x, Nav.replacements[x]));
      multiSwap(a, { "data-link" : "?p=" + p });
      finalizeTemplate(a);
      return a;
   }
};

