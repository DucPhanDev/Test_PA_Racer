( function() {
    // Helper functions

    /**
     * MurMurHash3, 32 bit flavour.
     */
    // eslint-disable-next-line
    window.murmurhash3_32_gc = function(e,c) {var h,r,t,a,o,d,A,C;for(h=3&e.length,r=e.length-h,t=c,o=3432918353,d=461845907,C=0;C<r;)A=255&e.charCodeAt(C)|(255&e.charCodeAt(++C))<<8|(255&e.charCodeAt(++C))<<16|(255&e.charCodeAt(++C))<<24,++C,t=27492+(65535&(a=5*(65535&(t=(t^=A=(65535&(A=(A=(65535&A)*o+(((A>>>16)*o&65535)<<16)&4294967295)<<15|A>>>17))*d+(((A>>>16)*d&65535)<<16)&4294967295)<<13|t>>>19))+((5*(t>>>16)&65535)<<16)&4294967295))+((58964+(a>>>16)&65535)<<16);switch(A=0,h){case 3:A^=(255&e.charCodeAt(C+2))<<16;case 2:A^=(255&e.charCodeAt(C+1))<<8;case 1:t^=A=(65535&(A=(A=(65535&(A^=255&e.charCodeAt(C)))*o+(((A>>>16)*o&65535)<<16)&4294967295)<<15|A>>>17))*d+(((A>>>16)*d&65535)<<16)&4294967295}return t^=e.length,t=2246822507*(65535&(t^=t>>>16))+((2246822507*(t>>>16)&65535)<<16)&4294967295,t=3266489909*(65535&(t^=t>>>13))+((3266489909*(t>>>16)&65535)<<16)&4294967295,(t^=t>>>16)>>>0}

    /**
     * Returns random string of exactly 16 characters long.
     */
    function generateSessionId() {
        // prepare working set. this is going to be a string of 12
        // characters since we will be encoding it using Base64 to get exactly 16
        // characters
        let accumulator = '';

        // check for crypto presence
        if ( window.crypto && window.crypto.getRandomValues ) {
            // allocate the buffer of 12 bytes so that we end up with 16 Base64 characters
            const buffer = new Uint8Array( 12 );
            // get random bytes
            window.crypto.getRandomValues( buffer );
            // transfer bytes to accumulator
            for ( let i = 0; i < buffer.length; i++ ) {
                accumulator += String.fromCharCode( buffer[ i ] );
            }
        } else {
            // prepare entropy values
            const entropies = [
                ( navigator.userAgent || navigator.vendor || window.opera ) + Math.random(),
                ( navigator.language || '' ) + window.innerWidth + window.innerHeight + Math.random(),
            ];

            try {
                // try using JSON representation of window.performance
                // this is by far the best entropy source available to us since it contains high-precision
                // clock initialization values.
                //
                // this, however, is a bit tricky: we cannot count on it being serializable since
                // SDKs/webviews can extend this object and introduce, say, circular references,
                // breaking JSON serialization – that's why try ... catch
                entropies.push( JSON.stringify( window.performance ) + Math.random() );
            } catch ( ex ) {
                // ok, something went wrong - fall back to "normal" date value instead
                entropies.push( new Date().valueOf().toString() );
            }

            // hash each entropy and place hash values into byte array
            for ( let i = 0; i < 3; i++ ) {
                // compute murmur hash
                let hash = window.murmurhash3_32_gc( entropies[ i ] );

                // transfer bytes of the number over to accumulator
                for ( let j = 0; j < 4; j++ ) {
                    accumulator += String.fromCharCode( hash & 0xff );
                    hash >>= 8;
                }
            }
        }

        // convert to Base64 string
        return btoa( accumulator );
    }

    /**
     * Returns true if the browser seems to support WebAssembly.
     */
    function checkWasmSupport() {
        try {
            // first of, check the presense of classes
            if ( ( typeof WebAssembly === 'object' ) && ( typeof WebAssembly.instantiate === 'function' ) ) {
                // try assembling a new WASM module from a minimal bytecode
                const wasmModule = new WebAssembly.Module( new Uint8Array( [ 0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00 ] ) );
                // check that the module did assemble
                if ( wasmModule instanceof WebAssembly.Module ) {
                    // finally, check the instantiation bit
                    return ( new WebAssembly.Instance( wasmModule ) instanceof WebAssembly.Instance );
                }
            }
        } catch ( e ) {
            // eat up all exceptions
        }

        return false;
    }

    // Prepare and cache timer function
    const now = ( !window.performance || !window.performance.now || !window.performance.timing ) ? Date.now : function() {
        return window.performance.now();
    };

    /**
     * Represents Luna PI runtime interface designed for collection platform information
     * and data.
     *
     * @param    {String}    adNetwork      Ad network identifier.
     * @param    {String}    appId          Unique app identifier.
     * @param    {String}    signature      Signature to use.
     * @param    {String}    buildId        Unique build identifier.
     * @param    {String}    statsUrl       Base URL for stats endpoint.
     * @param    {String}    configUrl      Config URL for remote config endpoint.
     * @param    {String}    configTimeout  Config loading timeout.
     * @param    {String}    configDelay    Config loading delay.
     */
    const PlayableInsights = function( adNetwork, appId, buildId, signature, statsUrl, configUrl, configTimeout, configDelay, permutationWhitelist, errorEndpointUrl ) {
        this.env = {
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            sessionId: generateSessionId(),
            signature: signature,
            locale: ( navigator.language || '' ).split( '-' )[ 0 ] || 'xx',
            version: 1,
            appId: appId,
            adNetwork: adNetwork,
            buildId: buildId,
            wasm: checkWasmSupport(),
            permutationId: 0,
            lastPing: 0,
            interactionClientX: 0,
            interactionClientY: 0,
            isRewarded: PlayableInsights.IS_REWARDED_UNKNOWN,
            webglVersion: window.WebGL2RenderingContext ? 2 : 1,
        };

        // holds the number of appearances of each event
        this.eventSequenceNumbers = {};
        this.totalEvents = 0;

        this.permutationWhitelist = permutationWhitelist;
        this.statsUrl = statsUrl;
        this.configUrl = configUrl;
        this.errorEndpointUrl = errorEndpointUrl;

        const currentNow = now();

        // configure separate timestamp "tracks" to be able to log independent time
        // offsets for various types of events
        this.timestamps = {
            default: {
                timestamp: currentNow,
                previousTimestamp: currentNow,
            },

            system: {
                timestamp: currentNow,
                previousTimestamp: currentNow,
            },
        };

        // set frame timestamp very far in the future
        this.frameTimestamp = 1e9;
        this.configTimeout = configTimeout;
        this.configDelay = configDelay;

        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isTouchDevice = navigator.maxTouchPoints && navigator.maxTouchPoints > 2;

        if ( /windows phone/i.test( userAgent ) ) {
            this.env.os = 'wp';
        } else if ( /android/i.test( userAgent ) ) {
            this.env.os = 'android';
        } else if ( /ipad|iphone|ipod/i.test( userAgent ) ) {
            this.env.os = 'ios';
        } else if ( /macintosh/i.test( userAgent ) && isTouchDevice && !window.MSStream ) {
            this.env.os = 'ios';
        } else {
            this.env.os = '';
        }

        this.env = Object.assign( this.env, window.PI_ENV_OVERRIDE || {} );

        this.subscribeToSystemEvents();
        this.fetchConfig();
        this.subscribeToInteraction();
    };

    // Set constructor
    PlayableInsights.prototype.constructor = PlayableInsights;

    // Prepare constants
    PlayableInsights.LOAD_EVENT_NAME = 'load';
    PlayableInsights.LOADED_EVENT_NAME = 'loaded';
    PlayableInsights.STARTING_EVENT_NAME = 'starting';
    PlayableInsights.STARTED_EVENT_NAME = 'started';
    PlayableInsights.INTERACTION_EVENT_NAME = 'interaction';
    PlayableInsights.CTA_EVENT_NAME = 'cta';
    PlayableInsights.SAMPLE_EVENT_NAME = 'sample';
    PlayableInsights.BOUNCE_EVENT_NAME = 'bounce';
    PlayableInsights.FRAME_EVENT_NAME = 'frame';
    PlayableInsights.CONFIG_EVENT_NAME = 'config';
    PlayableInsights.GAME_END_EVENT_NAME = 'game_end';
    PlayableInsights.INTERNAL_CLICK_EVENT_NAME = 'internal.click';
    PlayableInsights.CUSTOM_EVENT_NAME_PREFIX = 'custom.';
    PlayableInsights.SYSTEM_EVENT_NAME_PREFIX = 'system.';

    PlayableInsights.PERFORMANCE_SAMPLE_INTERVAL = 5 * 1000;
    PlayableInsights.BOUNCE_TIME_DIFFERENCE = 1000;

    PlayableInsights.FACEBOOK_AD_NETWORK_NAME = 'facebook';
    PlayableInsights.IRONSOURCE_AD_NETWORK_NAME = 'ironsource';
    PlayableInsights.VUNGLE_AD_NETWORK_NAME = 'vungle';
    PlayableInsights.MINTEGRAL_AD_NETWORK_NAME = 'mintegral';

    PlayableInsights.MAX_EVENTS = 256;
    PlayableInsights.MAX_SEQUENCE_NUMBER = 32;

    PlayableInsights.IS_REWARDED_TRUE = 1;
    PlayableInsights.IS_REWARDED_FALSE = 0;
    PlayableInsights.IS_REWARDED_UNKNOWN = 2;

    PlayableInsights.IRON_SOURCE_PRODUCT_TYPE_REWARDED_VIDEO = 'RewardedVideo';
    PlayableInsights.IRON_SOURCE_PRODUCT_TYPE_INTERSTITIAL = 'Interstitial';

    // Update prototype with methods
    Object.assign( PlayableInsights.prototype, {

        /**
         * Starts the procedure of fetching the remote config, if the URL was configured.
         */
        fetchConfig: function() {
            // memoize the timestamp
            this.configRequestedAt = now();

            // check if the config URL is present
            if ( !this.configUrl ) {
                // it's not - let's make our promise resolve with null instantly
                this.configFetchPromise = new Promise( ( resolve ) => {
                    resolve( null );
                } );

                return;
            }

            // construct config fetching promise and launch it like now
            this.configFetchPromise = fetch( this.configUrl ).then( ( response ) => response.json() ).catch( ( error ) => null );
        },

        /**
         * Returns a random number in [0..1) range used for picking a config
         * to show.
         */
        rollADice: function() {
            return window.PI_CONFIG_RANDOM || Math.random();
        },

        /**
         * Renders a debug dropdown overlaying the page with a list of baked permutations if the
         * playable URL contains mv_debug parameter.
         */
        selectPermutationFromUI: function() {
            if ( !location.search || location.search.indexOf( 'mv_debug=true' ) < 0 ) {
                return new Promise( ( resolve ) => {
                    resolve();
                } );
            }

            return new Promise( ( resolve ) => {
                const container = document.createElement( 'div' );
                container.style = 'background: white; overflow: scroll; position: absolute; z-index: 1000000; top: 50%; left: 50%; width: 90%; height: 20%; transform: translateX(-50%) translateY(-50%);';

                const onChange = function( id ) {
                    const data = window.pi.permutationWhitelist[ id ];

                    if ( !data ) {
                        window.pi.env.permutationId = 0;
                        window.playgroundOverrides = {};
                    } else {
                        window.pi.env.permutationId = id;
                        window.playgroundOverrides = data;
                    }

                    document.body.removeChild( container );

                    resolve();
                };

                for ( const id in window.pi.permutationWhitelist ) {
                    const option = document.createElement( 'a' );
                    const idValue = parseInt( id, 10 );

                    option.innerText = 'Permutation #' + id;
                    option.style = 'display: block; padding: 0.25em 0.5em; text-decoration: underline; position: static; color: black';
                    option.onclick = function() {
                        onChange( this );
                    }.bind( idValue );

                    container.appendChild( option );
                }

                document.body.appendChild( container );
            } );
        },

        /**
         * Filters the permutations against the whilelist and updates the thresholds so
         * that the relative weights remain valid.
         */
        filterPermutations: function( permutations ) {
            if ( !this.permutationWhitelist ) {
                return permutations;
            }

            let previousThreshold = 0.0;
            const weightMultiplier = 1e6;

            // iterate over all permutations and assign the weight
            for ( let i = 0; i < permutations.length; i++ ) {
                // get the permutation
                const permutation = permutations[ i ];

                // compute the real weight
                permutation.weight = weightMultiplier * ( permutation.threshold - previousThreshold );
                // update the preview
                previousThreshold = permutation.threshold;
            }

            // now, assemble a new array of permutations that ended up in the whitelist
            const filteredPermutations = [];
            // also, keep track of the total weight
            let totalWeight = 0.0;

            // iterate over all permutations again
            for ( let i = 0; i < permutations.length; i++ ) {
                // get the permutation
                const permutation = permutations[ i ];
                const bakedPermutationData = this.permutationWhitelist[ permutation.id ];

                // check that the permutation is present in the whitelist
                if ( bakedPermutationData ) {
                    // assemble the permutation
                    const bakedPermutation = { id: permutation.id, weight: permutation.weight, data: bakedPermutationData };
                    // append the permutation to the collection
                    filteredPermutations.push( bakedPermutation );
                    // accumulate the weight
                    totalWeight += bakedPermutation.weight;
                }
            }

            // now, recompute the thresholds
            let threshold = 0.0;

            // iterate over all permutations again
            for ( let i = 0; i < filteredPermutations.length; i++ ) {
                // get the permutation
                const permutation = filteredPermutations[ i ];

                threshold += permutation.weight / totalWeight;
                permutation.threshold = threshold;
            }

            return filteredPermutations;
        },

        /**
         * Attempts to find a specific permutation set matching current segment's value. If the current segment
         * is not provided in segments dictionary (e.g. an unknown platform is encountered), an empty array is
         * returned to avoid skewing the statistics.
         */
        collectPermutationsForSegment: function( permutations, segment, segments ) {
            // assemble a mapping from segment name to current segment value
            const currentSegmentValues = {
                os: this.env.os,
                ad_network: this.env.adNetwork,
                ad_network_os: `${this.env.adNetwork}@${this.env.os}`,
                orientation: this.env.screenWidth > this.env.screenHeight ? 'landscape' : 'portrait',
                locale: this.env.locale,
                none: '',
            };

            // extract weights corresponding to our segment (e.g. unityads if we are on unityads and segment is ad_network)
            const currentSegmentValue = currentSegmentValues[ segment ];
            const weights = segments[ currentSegmentValue ];

            // if no weights are found, we are not able to run any test – just return an empty array.
            // we could still serve a random permutation, but this data won't be used by test optimizer anyway, so let's
            // not bother for now
            if ( !weights ) {
                return [];
            }

            // collect specific permutations and their weights as per the configuration
            const result = weights.map( ( [ id, weight ] ) => ( { id, weight, data: permutations[ id ] } ) );

            // convert weights into thresholds to help random pick one
            const totalWeight = result.reduce( ( total, permutation ) => total + permutation.weight, 0 );
            let threshold = 0.0;

            return result.map( ( permutation, index ) => {
                // advance the threshold
                threshold += permutation.weight / totalWeight;

                // make sure the last elemnt's threshold is set to 1 to avoid rounding trap
                if ( index === result.length - 1 ) {
                    threshold = 1.0;
                }

                return { ...permutation, threshold };
            } );
        },

        /**
         * Awaits fetchConfigPromise and attempts to update PG overrides
         * based on the data received.
         */
        selectPermutationFromConfig: function() {
            const timeBudget = Math.max( 0, Math.min( this.configDelay, this.configTimeout - now() ) );

            this.configTimeoutPromise = new Promise( ( resolve ) => {
                setTimeout( resolve, timeBudget );
            } );

            const promise = Promise.race( [
                this.configFetchPromise,
                this.configTimeoutPromise,
            ] );

            const number = this.rollADice();
            const configRequestedAt = this.configRequestedAt;

            return promise.then( ( json ) => {
                // check that we have a valid JSON (either v1 or v2)
                if ( !json || !( json.permutations || json.all_permutations ) ) {
                    return;
                }

                // unpack permutations into initial set
                let permutationSet = json.permutations;

                // check if v2 manifest is in play – if so, use segment value to gather particular set
                if ( json.segments ) {
                    permutationSet = window.pi.collectPermutationsForSegment( json.all_permutations, json.segment, json.segments );
                }

                // filter the permutations against the whilelist, if one is supplied
                const permutations = window.pi.filterPermutations( permutationSet );

                // find a permutation that suits us
                for ( let i = 0; i < permutations.length; i++ ) {
                    const permutation = permutations[ i ];

                    // check that threshold is equal or above the random number
                    if ( permutation.threshold >= number ) {
                        window.pi.env.permutationId = permutation.id;
                        window.playgroundOverrides = permutation.data;

                        break;
                    }
                }

                // log the event along with timedelta
                window.pi.logEvent( PlayableInsights.CONFIG_EVENT_NAME, false, { timedelta: now() - configRequestedAt } );
            } );
        },

        /**
         * Awaits config promise along with Bridge.ready event and executes the callback.
         */
        ready: function( callback ) {
            Promise.all( [
                new Promise( Bridge.ready ),
                this.selectPermutationFromConfig(),
                this.selectPermutationFromUI(),
            ] ).then( callback );
        },

        /**
         * Attaches internal handlers to application object.
         *
         * @param    {pc.Application}    app    Applicaiton object to listen.
         */
        attachTo: function( app ) {
            // [NOTE] we need to support playables built with old pc.events here
            this.app = app;

            this.app.events ?
                this.app.events.on( 'postrender', this.onPostRender, this ) :
                this.app.on( 'postrender', this.onPostRender, this );
        },

        /**
         * Subscribes logger to user interactions.
         */
        subscribeToInteraction: function() {
            document.addEventListener( 'DOMContentLoaded', () => {
                // also, watch for touch/click events to support interaction event
                this.onInteractionCallback = this.onInteraction.bind( this );
                document.body.addEventListener( 'click', this.onInteractionCallback );
                document.body.addEventListener( 'touchstart', this.onInteractionCallback );
            } );
        },

        /**
         * Logs interaction event, but only once.
         */
        onInteraction: function( event ) {
            if ( this.isEventLogged( PlayableInsights.FRAME_EVENT_NAME, 1 ) && !this.isEventLogged( PlayableInsights.INTERACTION_EVENT_NAME, 1 ) ) {
                this.captureInteractionEventData( event );
                this.logInteraction( event );
            }

            if ( !this.isEventLogged( PlayableInsights.INTERNAL_CLICK_EVENT_NAME, 5 ) ) {
                this.captureInteractionEventData( event );
                this.logEvent( PlayableInsights.INTERNAL_CLICK_EVENT_NAME, false, {} );
            }
        },

        /**
         * Extracts coordinates from the interaction events and stores them in the env so that upcoming
         * event logs can use these during reports.
         *
         * @param {Event}    event     Event instance to grab details from.
         */
        captureInteractionEventData: function( event ) {
            const touchSource = event.type === 'touchstart' ? event.touches[ 0 ] : event;

            this.env.interactionClientX = ( touchSource.clientX * 1.0 / window.innerWidth );
            this.env.interactionClientY = ( touchSource.clientY * 1.0 / window.innerHeight );
        },

        /**
         * Starts watching for the bounce-back event to measure time step in store.
         */
        startWatchingBounce: function() {
            this.onRequestAnimationFrameTimestamp = now();
            this.onRequestAnimationFrameCallback = this.onRequestAnimationFrame.bind( this );

            this.onRequestAnimationFrameCallback();
        },

        /**
         * The callback for requestAnimationFrame indicating the webview is foreground and can render
         * bits onto the screen.
         */
        onRequestAnimationFrame: function() {
            const delta = now() - this.onRequestAnimationFrameTimestamp;

            if ( delta > PlayableInsights.BOUNCE_TIME_DIFFERENCE ) {
                this.logBounce( delta );
            }

            this.onRequestAnimationFrameTimestamp = now();
            window.requestAnimationFrame( this.onRequestAnimationFrameCallback );
        },

        /**
         * Awaits the postrender event and reports 'frame' event if it hapenned to have non-zero
         * screen size and we actually believe it's doing some "real" rendering now rather then being
         * hidden by an overlay or a video.
         */
        onPostRender: function() {
            if ( window.innerWidth <= 1 || window.innerHeight <= 1 ) {
                return;
            }

            // unsubscribe from the rendering events, just in case
            if ( this.app ) {
                if ( this.app.events ) {
                    this.app.events.off( 'postrender', this.onPostRender, this );
                } else {
                    this.app.off( 'postrender', this.onPostRender, this );
                }
            }

            this.logFrame();
        },

        /**
         * Acts as a callback for requestAnimationFrame() routine reporting frame event as soon as it is invoked
         * and window size execeeds 0x0 :)
         */
        onFirstFrame: function() {
            if ( window.innerWidth <= 1 || window.innerHeight <= 1 ) {
                window.requestAnimationFrame( this.onFirstFrameCallback );
                return;
            }

            this.logFrame();
        },

        /**
         * Logs an arbitrary event to the server.
         *
         * @param {String} eventName - Name of the event to log.
         * @param {bool} resetTimestamp - Whether to reset the timestamp.
         * @param {Object} options - Optional data to overwrite in the event.
         */
        logEvent: function( eventName, resetTimestamp, options ) {
            // try injecting network-specific data items
            this.injectIronSourceAdData();
            this.injectVungleAdData();
            this.injectMintegralAdData();

            // increment the counter
            this.totalEvents++;

            return new Promise( ( resolve, reject ) => {
                try {
                    // try updating the dimensions
                    this.env.screenWidth = window.innerWidth;
                    this.env.screenHeight = window.innerHeight;

                    let json = Object.assign( {}, this.env );
                    const time = now();

                    // optionally populate app performance metrics
                    if ( this.app && this.app.counters ) {
                        json = Object.assign( json, this.app.counters.getSnapshot() );
                    }

                    // decide which timestamp track to use
                    let timestamps = this.timestamps.default;
                    if ( eventName.indexOf( PlayableInsights.SYSTEM_EVENT_NAME_PREFIX ) === 0 ) {
                        timestamps = this.timestamps.system;
                    }

                    // populate JSON with event data.
                    json.timestamp = time - timestamps.timestamp;
                    json.timedelta = time - timestamps.previousTimestamp;
                    json.eventName = eventName;

                    // update previou event's timestamp
                    if ( resetTimestamp ) {
                        timestamps.previousTimestamp = time;
                    }

                    // update frameTimestamp if it's a frame event
                    if ( eventName === PlayableInsights.FRAME_EVENT_NAME ) {
                        this.frameTimestamp = time;
                    }

                    // update timestampSinceFrame field, falling back to -1 if the frame timestamp is in the future
                    // meaning the frame event didn't occur yet
                    json.timestampSinceFrame = Math.max( -1, time - this.frameTimestamp );

                    // optionally override event fields with the options provided.
                    if ( options ) {
                        json = Object.assign( json, options );
                    }

                    // lazily initialize event's seq no and increment it
                    json.seqNo = this.incrementSequenceNumber( eventName );

                    // check that limits are ok
                    if ( !this.validateEventLimits( eventName ) ) {
                        return;
                    }

                    const endpointToUse = json.errorMessage ? this.errorEndpointUrl : this.statsUrl;

                    if ( endpointToUse ) {
                        // prepare body data
                        const body = JSON.stringify( json );
                        const requestStartedAt = now();

                        // debug log
                        if ( this.displayEvents() ) {
                            console.log( 'π: Logging event ' + body + ' to ' + endpointToUse );
                        }

                        // actually perform the postback
                        fetch( endpointToUse, {
                            method: 'POST',
                            mode: 'no-cors',
                            body: body,
                        } )
                            .then( () => {
                                // debug log
                                if ( this.displayEvents() ) {
                                    console.log( 'π: Event delivered!' );
                                }

                                window.pi.env.lastPing = ( now() - requestStartedAt ) | 0;
                                resolve();
                            }, ( error ) => {
                                // debug log
                                console.warn( 'π: Event failed at dilvery: ' + error );
                                reject( error );
                            } );
                    } else {
                        // debug log
                        if ( this.displayEvents() ) {
                            console.log( 'π: Not logging event ' + eventName + ' as no endpoint URL is provided!' );
                        }

                        resolve();
                    }
                } catch ( ex ) {
                    // debug log
                    console.warn( 'π: Exception during submitting the event: ' + ex );
                    reject( ex );
                }
            } );
        },

        /**
         * Check is logEvents should be showed.
         */
        displayEvents: function() {
            // eslint-disable-next-line no-undef
            return ( window.hasOwnProperty( 'DEBUG' ) && DEBUG ) || ( window.hasOwnProperty( 'TESTS' ) && TESTS );
        },

        /**
         * Logs 'load' event.
         */
        logLoad: function() {
            this.logEvent( PlayableInsights.LOAD_EVENT_NAME, true, null );
        },

        /**
         * Logs 'loaded' event.
         */
        logLoaded: function() {
            this.logEvent( PlayableInsights.LOADED_EVENT_NAME, true, null );
        },

        /**
         * Logs 'starting' event.
         */
        logStarting: function() {
            this.logEvent( PlayableInsights.STARTING_EVENT_NAME, true, null );
        },

        /**
         * Logs 'started' event.
         */
        logStarted: function() {
            this.logEvent( PlayableInsights.STARTED_EVENT_NAME, true, null );

            // check if this is a third-party playable
            if ( !window.UnityEngine ) {
                // it seems to be it - let's await for frame event as best as we can :)
                this.onFirstFrameCallback = this.onFirstFrame.bind( this );
                window.requestAnimationFrame( this.onFirstFrameCallback );
            }

            this.performanceSampleInterval = this.performanceSampleInterval || setInterval( this.logSample.bind( this ), PlayableInsights.PERFORMANCE_SAMPLE_INTERVAL );
        },

        /**
         * Logs 'interaction' event.
         */
        logInteraction: function( event ) {
            this.logEvent( PlayableInsights.INTERACTION_EVENT_NAME, true, null );
        },

        /**
         * Logs 'cta' event.
         */
        logCta: function() {
            this.logEvent( PlayableInsights.CTA_EVENT_NAME, true, null );
            this.startWatchingBounce();
        },

        /**
         * Logs 'sample' event.
         */
        logSample: function() {
            this.logEvent( PlayableInsights.SAMPLE_EVENT_NAME, false, null );
        },

        /**
         * Logs 'bounce' event.
         *
         * @param    {Number}    timedelta     Time delta to set.
         */
        logBounce: function( timedelta ) {
            this.logEvent( PlayableInsights.BOUNCE_EVENT_NAME, true, { timedelta: timedelta } );
        },

        /**
         * Logs 'bounce' event.
         *
         * @param    {Number}    timedelta     Time delta to set.
         */
        logFrame: function() {
            this.logEvent( PlayableInsights.FRAME_EVENT_NAME, true, null );
        },

        /**
         * Logs 'game_end' event.
         */
        logGameEnd: function() {
            this.logEvent( PlayableInsights.GAME_END_EVENT_NAME, false, null );
        },

        /**
         * Logs user-provided event checking that is does not intesect with
         * system events.
         *
         * @param    {String}    eventName     Event name to log.
         * @param    {Number}    intParameter  Custom integer parameter to use.
         */
        logCustomEvent: function( eventName, intParameter ) {
            // prefix custom event to avoid name clashes
            eventName = PlayableInsights.CUSTOM_EVENT_NAME_PREFIX + eventName;

            // issue the event call
            return this.logEvent( eventName, false, { intParameter: ( intParameter || 0 ) } );
        },

        /**
         * Returns true if the event has been logged already.
         *
         * @param    {String}    eventName     Event name to check.
         * @param    {Number}    threshold     The number of times to consider event "logged".
         */
        isEventLogged: function( eventName, threshold ) {
            if ( !this.eventSequenceNumbers.hasOwnProperty( eventName ) ) {
                return false;
            }

            return this.eventSequenceNumbers[ eventName ] >= threshold;
        },

        /**
         * Attempts to parse data provided by dapi.getAdData() or mraid.getMraidAdData()
         * to detect ad environment settings we are running in.
         */
        injectIronSourceAdData: function() {
            // check if impression id is already stored
            if ( this.env.impressionId ) {
                return;
            }

            // bail out if dapi is not available
            if ( this.env.adNetwork !== PlayableInsights.IRONSOURCE_AD_NETWORK_NAME ) {
                return;
            }

            try {
                // get ad data from dapi
                const adData = window.mraid ? mraid.getMraidAdData() : dapi.getAdData();

                // extract UII and from dapi's API
                this.env.impressionId = adData.UII;
                this.env.creativeId = adData.creativeId || '';
                this.env.campaignId = adData.campaignId || '';

                // detect rewarded status
                if ( adData.productType === PlayableInsights.IRON_SOURCE_PRODUCT_TYPE_REWARDED_VIDEO ) {
                    this.env.isRewarded = PlayableInsights.IS_REWARDED_TRUE;
                } else if ( adData.productType === PlayableInsights.IRON_SOURCE_PRODUCT_TYPE_INTERSTITIAL ) {
                    this.env.isRewarded = PlayableInsights.IS_REWARDED_FALSE;
                }
            } catch ( ex ) {
                // we are here if iS API is not avialable, so really nothing to do
            }
        },

        /**
         * Attempts to parse data provided by VungleHelper to detect ad environment settings we are running in.
         */
        injectVungleAdData: function() {
            // only try accessing Vungle data on Vungle (sic!)
            if ( this.env.adNetwork !== PlayableInsights.VUNGLE_AD_NETWORK_NAME ) {
                return;
            }

            // bail out if VungleHelper is not available
            if ( !window.VungleHelper ) {
                return;
            }

            try {
                // detect rewarded status
                if ( window.VungleHelper.rewardedAd === true ) {
                    this.env.isRewarded = PlayableInsights.IS_REWARDED_TRUE;
                } else if ( window.VungleHelper.rewardedAd === false ) {
                    this.env.isRewarded = PlayableInsights.IS_REWARDED_FALSE;
                }
            } catch ( ex ) {
                // we are here something went wrong.
            }
        },

        /**
         * Attempts to parse data provided by Mintegral to detect ad environment settings we are running in.
         */
        injectMintegralAdData: function() {
            // only try accessing Mintegral data on Mintegral (sic!)
            if ( this.env.adNetwork !== PlayableInsights.MINTEGRAL_AD_NETWORK_NAME ) {
                return;
            }

            // bail out if Mintegral data is not available
            if ( !window.MW_INIT ) {
                return;
            }

            try {
                // gather isRewardAds() value
                const isRewardAds = window.MW_INIT.isRewardAds();

                // detect rewarded status
                if ( isRewardAds === true ) {
                    this.env.isRewarded = PlayableInsights.IS_REWARDED_TRUE;
                } else if ( isRewardAds === false ) {
                    this.env.isRewarded = PlayableInsights.IS_REWARDED_FALSE;
                }
            } catch ( ex ) {
                // we are here something went wrong.
            }
        },

        /**
         * Initializes or increments sequence number for the given event name.
         *
         * @param    {String}    eventName     Event name to update sequence number for.
         */
        incrementSequenceNumber: function( eventName ) {
            this.eventSequenceNumbers[ eventName ] = ( this.eventSequenceNumbers[ eventName ] || 0 ) + 1;
            return this.eventSequenceNumbers[ eventName ];
        },

        /**
         * Returns true if current game session has not exceeded neither global event limit
         * nor specific one.
         *
         * @param    {String}    eventName     Event name to validate against limits.
         */
        validateEventLimits: function( eventName ) {
            // validate we are not exceeding global limit
            if ( this.totalEvents >= PlayableInsights.MAX_EVENTS ) {
                // debug log
                console.log( 'π: Skipping event ' + eventName + ' - already logged ' + PlayableInsights.MAX_EVENTS + ' events during the session' );
                // bail out
                return false;
            }

            // validate we are not exceeding per-event limit
            if ( this.eventSequenceNumbers[ eventName ] > PlayableInsights.MAX_SEQUENCE_NUMBER ) {
                // debug log
                console.log( 'π: Skipping event ' + eventName + ' - already logged ' + PlayableInsights.MAX_SEQUENCE_NUMBER + ' events of that name' );
                // bail out
                return false;
            }

            return true;
        },

        /**
         * If the random is in our favour (and not overriden - for test purposes), subsribe to system events to log
         * diagnostic messages to PI.
         */
        subscribeToSystemEvents: function() {
            // exit if system events are disabled explicitely
            if ( window.__playgroundInsightsEnableSystemEvents === false ) {
                return;
            }

            // exit if system events are not enabled forcefully and random is too high :)
            if ( window.__playgroundInsightsEnableSystemEvents !== true && Math.random() > 0.1 ) {
                return;
            }

            const systemEventsMap = [
                'DOMContentLoaded',
                'luna:build',
                'luna:start',
                'luna:startup:bundlesLoad',
                'luna:startup:loadSimpleAssetsAsync',
                'luna:startup:shaderReady',
                'luna:startup:loadComplexAssetsAsync',
                'luna:startup:loadPrefabsAsync',
                'luna:startup:loadScenesAsync',
                'luna:started',
            ];

            this.logEvent( 'system.load', false, {} );

            systemEventsMap.forEach( ( eventName ) => {
                window.addEventListener( eventName, () => {
                    this.logEvent( 'system.' + eventName.toLowerCase(), true, {} );
                } );
            } );
        },
    } );

    /**
     * "Patched" variant of logEvent function tailored to work for Facebook.
     *
     * @param    {String}    eventName          Name of the event to log.
     * @param    {Number}    resetTimestamp     Whether to reset the timestamp.
     * @param    {Object}    options            Optional data to overwrite in the event.
     */
    function logEventUsingFacebookAdSdk( eventName, resetTimestamp, options ) {
        if ( typeof FbPlayableAd === 'undefined' ) {
            console.warn( 'FbPlayableAd is not defined' );
            return;
        }

        // increment counters, global and per-event ones
        this.totalEvents++;
        this.incrementSequenceNumber( eventName );

        // validate the limits are not exceeded with this event
        if ( !this.validateEventLimits( eventName ) ) {
            return;
        }

        switch ( eventName ) {
            // we map 'loaded' event onto Facebook's game load event.
            case PlayableInsights.LOADED_EVENT_NAME: {
                FbPlayableAd.logGameLoad();
                console.log( 'π: Logged frame event as FbPlayableAd.logGameLoad' );
                break;
            }

            // we map 'starting', 'started' and 'frame' events onto Facebook's levelComplete event.
            case PlayableInsights.STARTING_EVENT_NAME:
            case PlayableInsights.STARTED_EVENT_NAME:
            case PlayableInsights.FRAME_EVENT_NAME:
            case PlayableInsights.GAME_END_EVENT_NAME: {
                FbPlayableAd.logLevelComplete( eventName );
                console.log( 'π: Logged ' + eventName + ' event as FbPlayableAd.logLevelComplete with ' + eventName );
                break;
            }

            // we map 'interaction' event onto Facebook's button click event
            case PlayableInsights.INTERACTION_EVENT_NAME: {
                FbPlayableAd.logButtonClick( 'interaction', 0, 0 );
                console.log( 'π: Logged interaction event as FbPlayableAd.logButtonClick' );
                break;
            }

            default: {
                console.log( 'π: Not logging ' + eventName + ' since it does not map to Facebook SDK' );
            }
        }
    }

    /**
     * "Patched" variant of logCustomEvent function tailored to work for Facebook.
     *
     * @param    {String}    eventName     Event name to log.
     * @param    {Number}    intParameter  Custom integer parameter to use.
     */
    function logCustomEventUsingFacebookAdSdk( eventName, intParameter ) {
        // increment counters, global and per-event ones
        this.totalEvents++;
        this.incrementSequenceNumber( eventName );

        // validate the limits are not exceeded with this event
        if ( !this.validateEventLimits( eventName ) ) {
            return;
        }

        // prefix custom event to avoid name clashes
        eventName = PlayableInsights.CUSTOM_EVENT_NAME_PREFIX + eventName;

        // piggy-back on logLevelComplete to store it (best we can do)
        // to do so, invent level name
        const levelName = [ 'custom', eventName, ( intParameter || 0 ) ].join( ':' );

        // log the event
        FbPlayableAd.logLevelComplete( levelName );
        console.log( 'π: Logged ' + eventName + ' event as FbPlayableAd.logLevelComplete with ' + levelName );
    }

    /**
     * Factory method that initializes Playable Insights class and re-assigns
     * the pi variable to the newly created instance.
     *
     * @param    {String}    adNetwork    Ad network identifier.
     * @param    {String}    appId        Unique app identifier.
     * @param    {String}    buildId      Unique build identifier.
     * @param    {String}    signature    Signature to use.
     * @param    {String}    statsUrl     Base URL for stats endpoint.
     * @param    {String}    configUrl    Base URL for config endpoint.
     */
    window.pi = function( adNetwork, appId, buildId, signature, statsUrl, configUrl, configTimeout, configDelay, permutationWhitelist, errorEndpointUrl ) {
        window.pi = new PlayableInsights( adNetwork, appId, buildId, signature, statsUrl, configUrl, configTimeout, configDelay, permutationWhitelist, errorEndpointUrl );

        // check if we are running in Facebook environment, and, if so, initialize
        // logging SDK and patch PI methods to report to Facebook
        if ( adNetwork === PlayableInsights.FACEBOOK_AD_NETWORK_NAME ) {
            if ( typeof FbPlayableAd !== 'undefined' ) {
                window.pi.logEvent = logEventUsingFacebookAdSdk;
                window.pi.logCustomEvent = logCustomEventUsingFacebookAdSdk;

                FbPlayableAd.initializeLogging( statsUrl + '/facebook', [ 'appId=', appId, '&buildId=', buildId, '&signature=', signature ].join( '' ) );
            } else {
                console.warn( 'FbPlayableAd is not defined' );
            }
        }

        window.pi.logLoad();
    };
} )();
