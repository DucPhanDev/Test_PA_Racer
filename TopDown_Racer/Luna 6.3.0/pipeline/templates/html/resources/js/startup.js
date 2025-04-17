// USAGE:
// http://playable.url/?startup - basic usage, logs startup metrics, compute avg startup time for consecutive page reloads
// http://playable.url/?startup&clear - the same as just ?startup but clears all data from previous runs
// http://playable.url/?startup&runs=30 - reloads page 30 times and then logs startup metrics
// http://playable.url/?startup&runs=30&outliers=4 - reloads page 30 times and then logs startup metrics.
//     4 fastest and 4 slowest runs will be discarded, so that avg startup time will be based on 30 - 4 * 2 = 22 measurements.

( () => {
    if ( document.location.search.toLowerCase().indexOf( 'startup' ) === -1 ) {
        return;
    }

    // We hide usage of localStorage because some networks scans code with regex in order to detect its usage,
    // even if it's hidden under a url flag and never used in actual ad network
    const ls = window[ atob( 'bG9jYWxTdG9yYWdl' ) ];

    window.lunaStartup = {
        // Whole startup journey ( window.lunaStartup.logStartupEvent usages ):
        timestamps: {
            'luna:startup:htmlInitializationTimestamp': 0, // html loading started
            'DOMContentLoaded': 0, // html loading finished ( network related )
            'decompressionStarted': 0, // when we start decompressing the first asset
            'decompressionFinished': 0, // when we finish decompressing the last asset
            'luna:build': 0,
            'luna:start': 0, // Application.InitializeAsync() -> Bundles.LoadProjectSettingsAsync
            'luna:starting': 0, // bundle._downloadBundleDataAsync(), bundle._downloadBlobDataAsync()
            'luna:startup:bundlesLoad': 0, // Bundles loading started
            'luna:startup:loadSimpleAssetsAsync': 0, // ProjectSettings, texture, shader, mesh, video, sound, animationClip, blendTree, textAsset, urpAsset, audioMixer, physicsMaterial3d/2d, audioMixerSnapshot
            'luna:startup:shaderReady': 0, // Shader Compilation
            'luna:startup:loadComplexAssetsAsync': 0, // Cubemap, material, sprite, font, animatorController, animatorOverrideController
            'luna:startup:loadPrefabsAsync': 0, // Prefabs deserializations
            'luna:startup:loadScenesAsync': 0, // Scene assets deserialization. Final step of bundles loading
            'luna:started': 0, // Engine and scene are fully loaded and started (Load scene, invokeCallbacks (awake everything), call tick(update + renderFrame)
            'frame': 0, // First frame rendered on the screen
        },
        measuredTime: {
            'loadTime': 0, // Total Startup-time of playable
            'avgStartupTime': 0, // Average Startup-time of playable
        },

        logStartupEvent: function( event ) {
            this.timestamps[ event ] = performance.now();
        },

        notifyLoadingComplete: function() {
            const totalTime = this.toSeconds( this.timestamps.frame );
            const avgStartupTimeInfo = this.recordAverageStartupInfo( totalTime );
            if ( avgStartupTimeInfo !== null ) { // null means that page will be reloaded, alert will block that
                window.lunaStartup.measuredTime.avgStartupTime = avgStartupTimeInfo.avgStartupTime;
                const report = this.userFriendlyReport( totalTime.toFixed( 3 ), avgStartupTimeInfo.startupCount, avgStartupTimeInfo.avgStartupTime );
                pc.Application._currentApplication._startup_report = report;
                if ( document.location.search.toLowerCase().indexOf( 'startup' ) !== -1 ) {
                    // eslint-disable-next-line no-alert
                    window.alert( report );
                }
                return report;
            }

            return '';
        },

        recordAverageStartupInfo: function( totalTime ) {
            const pageParams = new URLSearchParams( location.search );
            const savedBuildID = ls.getItem( 'buildID' );
            const startupInfoJson = ls.getItem( 'startupMeasurements' ) || '{ "timings": [] }';
            let startupInfo = JSON.parse( startupInfoJson );
            const currentBuildID = Deserializers.buildID;
            const shouldClearSavedData = pageParams.has( 'clear' );
            if ( shouldClearSavedData || currentBuildID !== savedBuildID ) {
                startupInfo = { timings: [] };
                ls.setItem( 'buildID', currentBuildID );
            }
            pageParams.delete( 'clear' );

            startupInfo.timings.push( totalTime );
            ls.setItem( 'startupMeasurements', JSON.stringify( startupInfo ) );

            let shouldReloadPage = false;
            if ( pageParams.has( 'runs' ) ) {
                const runsRemaining = Number( pageParams.get( 'runs' ) );
                if ( runsRemaining <= 1 ) {
                    pageParams.delete( 'runs' );
                } else {
                    pageParams.set( 'runs', runsRemaining - 1 );
                    shouldReloadPage = true;
                }
            }
            history.replaceState( null, document.title, '?' + pageParams.toString() );
            if ( shouldReloadPage ) {
                location.reload();
                return null;
            }

            if ( pageParams.has( 'outliers' ) ) {
                let outliersToRemove = Number( pageParams.get( 'outliers' ) );
                startupInfo.timings.sort();
                while ( outliersToRemove > 0 ) {
                    startupInfo.timings.pop();
                    startupInfo.timings.shift();
                    outliersToRemove--;
                }
            }
            const startupTimesSum = startupInfo.timings.reduce( ( acc, t ) => acc + t, 0 );
            const startupCount = startupInfo.timings.length;
            const avgStartupTime = ( startupTimesSum / startupCount ).toFixed( 3 );
            return { startupCount: startupCount, avgStartupTime: avgStartupTime };
        },

        toSeconds( value ) {
            return ( value / 1000.0 );
        },

        toFormattedSeconds( value ) {
            return this.toSeconds( value ).toFixed( 3 );
        },

        toPercentsString( value, totalValue ) {
            return `${( value / totalValue * 100 ).toFixed( 1 )}%`;
        },

        userFriendlyReport: function( totalTime, startupCount, avgStartupTime ) {
            const targetPlatform = window.$environment.targetPlatform;
            let result = `Total (${targetPlatform}): ${totalTime}s - Average (${startupCount} startups): ${avgStartupTime}s\n`;

            // Compression might not be applied
            const decompressTime = this.toFormattedSeconds( this.timestamps.decompressionFinished - this.timestamps.decompressionStarted );

            let runningTotal = 0;
            const loadingTime = this.toFormattedSeconds( this.timestamps.DOMContentLoaded );
            const loadingTimePercents = this.toPercentsString( loadingTime, totalTime );
            result += `${loadingTime}s (${loadingTimePercents}) - Loading from network (Optimise with Size Breakdown, Base64/Base122):\n`;
            result += `  - Decompressions (async): ${decompressTime}s\n`;
            runningTotal += this.timestamps.DOMContentLoaded;

            const loadedAssemblies = Object.keys( Bridge.startup );
            const bridgeInitialisationTime = loadedAssemblies.reduce( ( accumulator, currentValue ) => accumulator + Bridge.startup[ currentValue ], 0 );
            result += `  - C# Code init: ${this.toFormattedSeconds( bridgeInitialisationTime )}s (Optimise with Runtime Analysis)\n`;

            // start -> starting -> bundles:load
            const bundlesParsingTime = this.toFormattedSeconds( this.timestamps[ 'luna:startup:bundlesLoad' ] - this.timestamps[ 'luna:start' ] );
            const bundlesParsingTimePercents = this.toPercentsString( bundlesParsingTime, totalTime );
            result += `${bundlesParsingTime}s (${bundlesParsingTimePercents}) - Assets Deserialization\n`;
            runningTotal += this.timestamps[ 'luna:startup:bundlesLoad' ] - this.timestamps[ 'luna:start' ];

            const simpleAssetsTime = this.toFormattedSeconds( this.timestamps[ 'luna:startup:loadSimpleAssetsAsync' ] - this.timestamps[ 'luna:startup:bundlesLoad' ] );
            const simpleAssetsTimePercents = this.toPercentsString( simpleAssetsTime, totalTime );
            result += `${simpleAssetsTime}s (${simpleAssetsTimePercents}) - Load: Textures, shaders, meshes, sounds, animations (Optimise with Size Breakdown)\n`;
            runningTotal += this.timestamps[ 'luna:startup:loadSimpleAssetsAsync' ] - this.timestamps[ 'luna:startup:bundlesLoad' ];

            const complexAssetsTime = this.toFormattedSeconds( this.timestamps[ 'luna:startup:loadComplexAssetsAsync' ] - this.timestamps[ 'luna:startup:loadSimpleAssetsAsync' ] );
            const complexAssetsTimePercents = this.toPercentsString( complexAssetsTime, totalTime );
            result += `${complexAssetsTime}s (${complexAssetsTimePercents}) - Load: Cubemaps, materials, sprites, fonts, animators\n`;
            runningTotal += this.timestamps[ 'luna:startup:loadComplexAssetsAsync' ] - this.timestamps[ 'luna:startup:loadSimpleAssetsAsync' ];

            const prefabsTime = this.toFormattedSeconds( this.timestamps[ 'luna:startup:loadPrefabsAsync' ] - this.timestamps[ 'luna:startup:loadComplexAssetsAsync' ] );
            const prefabsTimePercents = this.toPercentsString( prefabsTime, totalTime );
            result += `${prefabsTime}s (${prefabsTimePercents}) - Load: Prefabs\n`;
            runningTotal += this.timestamps[ 'luna:startup:loadPrefabsAsync' ] - this.timestamps[ 'luna:startup:loadComplexAssetsAsync' ];

            const sceneAssetsTime = this.toFormattedSeconds( this.timestamps[ 'luna:startup:loadScenesAsync' ] - this.timestamps[ 'luna:startup:loadPrefabsAsync' ] );
            const sceneAssetsTimePercents = this.toPercentsString( sceneAssetsTime, totalTime );
            result += `${sceneAssetsTime}s (${sceneAssetsTimePercents}) - Load: SceneData\n`;
            runningTotal += this.timestamps[ 'luna:startup:loadScenesAsync' ] - this.timestamps[ 'luna:startup:loadPrefabsAsync' ];

            const shaderReadyTime = this.toFormattedSeconds( this.timestamps[ 'luna:startup:shaderReady' ] - this.timestamps[ 'luna:startup:loadScenesAsync' ] );
            const shaderReadyTimePercents = this.toPercentsString( shaderReadyTime, totalTime );
            const shaderReport = pc.UnityShader.generateReport();
            result += `${shaderReadyTime}s (${shaderReadyTimePercents}) - Shaders compilation (Shaders: ${shaderReport.unityShadersCount}, Variants: ${shaderReport.totalVariantsCount}) (Optimise with Runtime Analysis)\n`;
            runningTotal += this.timestamps[ 'luna:startup:shaderReady' ] - this.timestamps[ 'luna:startup:loadScenesAsync' ];

            const initialSceneTime = this.toFormattedSeconds( this.timestamps[ 'luna:started' ] - this.timestamps[ 'luna:startup:shaderReady' ] );
            const initialSceneTimePercents = this.toPercentsString( initialSceneTime, totalTime );
            result += `${initialSceneTime}s (${initialSceneTimePercents}) - Scene Loading and Awake (Optimise initialisation code)\n`;
            runningTotal += this.timestamps[ 'luna:started' ] - this.timestamps[ 'luna:startup:shaderReady' ];

            const firstFrameTime = this.toFormattedSeconds( this.timestamps.frame - this.timestamps[ 'luna:started' ] );
            const firstFrameTimePercents = this.toPercentsString( firstFrameTime, totalTime );
            result += `${firstFrameTime}s (${firstFrameTimePercents}) - First frame time (Simplify shaders)\n`;
            runningTotal += this.timestamps.frame - this.timestamps[ 'luna:started' ];

            result += `${this.toFormattedSeconds( runningTotal )}s (${this.toPercentsString( runningTotal / 1000, totalTime )}) - Running Total\n`;
            if ( targetPlatform === 'develop' ) {
                result += 'For "develop" platform, build optimisations are not applied. Check final result on actual platform build on devices.\n';
            }

            return result;
        },

        /**
         * Prints delta for all logged events
         */
        debugReport: function() {
            const keys = Object.keys( this.timestamps );
            const values = Object.values( this.timestamps );
            const totalTime = this.toFormattedSeconds( values[ values.length - 1 ] - values[ 0 ] );
            let result = `Total: ${totalTime} seconds\n\n`;
            for ( let i = 1; i < values.length; i++ ) {
                const dT = this.toFormattedSeconds( values[ i ] - values[ i - 1 ] );
                result += `${dT} sec : ${keys[ i ]}\n`;
            }
            return result;
        },
        /**
         * returns true after rendering the first frame
         * @returns {boolean}
         */
        isLoadingFinished: function() {
            return ( this.timestamps[ 'luna:started' ] > 0 && this.timestamps.frame > 0 );
        },
    };

    // Log initial time of HTML loading
    window.addEventListener( 'DOMContentLoaded', () => {
        window.lunaStartup.logStartupEvent( 'DOMContentLoaded' );
    } );

    window.addEventListener( 'luna:build', () => {
        window.lunaStartup.logStartupEvent( 'luna:build' );
    } );

    window.addEventListener( 'luna:start', () => {
        window.lunaStartup.logStartupEvent( 'luna:start' );
    } );

    window.addEventListener( 'luna:starting', () => {
        window.lunaStartup.logStartupEvent( 'luna:starting' );
    } );

    window.addEventListener( 'luna:startup:bundlesLoad', () => {
        window.lunaStartup.logStartupEvent( 'luna:startup:bundlesLoad' );
    } );

    window.addEventListener( 'luna:startup:loadSimpleAssetsAsync', () => {
        window.lunaStartup.logStartupEvent( 'luna:startup:loadSimpleAssetsAsync' );
    } );

    window.addEventListener( 'luna:startup:shaderReady', () => {
        window.lunaStartup.logStartupEvent( 'luna:startup:shaderReady' );
    } );

    window.addEventListener( 'luna:startup:loadComplexAssetsAsync', () => {
        window.lunaStartup.logStartupEvent( 'luna:startup:loadComplexAssetsAsync' );
    } );

    window.addEventListener( 'luna:startup:loadPrefabsAsync', () => {
        window.lunaStartup.logStartupEvent( 'luna:startup:loadPrefabsAsync' );
    } );

    window.addEventListener( 'luna:startup:loadScenesAsync', () => {
        window.lunaStartup.logStartupEvent( 'luna:startup:loadScenesAsync' );
    } );

    window.addEventListener( 'luna:started', () => {
        window.lunaStartup.logStartupEvent( 'luna:started' );
        window.lunaStartup.measuredTime.loadTime = window.lunaStartup.timestamps[ 'luna:started' ] - window.lunaStartup.timestamps[ 'luna:startup:htmlInitializationTimestamp' ];

        const app = pc.Application.getApplication();
        // for backward compatibility, in our Playable tests we have older version of Application events,
        // where we patched application itself with events compatibility
        const events = app.events || app;
        events.once( 'postrender', () => {
            window.lunaStartup.logStartupEvent( 'frame' );

            // frame won't be rendered until requestAnimationFrame callback is finished,
            // so let's wait for next frame to show alert
            events.once( 'prerender', () => {
                window.lunaStartup.notifyLoadingComplete();
            }, this );
        }, this );
    } );
} )();
