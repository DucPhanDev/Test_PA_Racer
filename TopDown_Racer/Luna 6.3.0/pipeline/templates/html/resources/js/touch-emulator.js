// based on https://github.com/hammerjs/touchemulator/blob/master/touch-emulator.js but with no polyfills
// and multi-touch support

( () => {
    let eventTarget;

    /**
     * create an touch point
     * @constructor
     * @param target
     * @param identifier
     * @param pos
     * @param deltaX
     * @param deltaY
     * @returns {Object} touchPoint
     */
    function Touch( target, identifier, pos, deltaX, deltaY ) {
        deltaX = deltaX || 0;
        deltaY = deltaY || 0;

        this.identifier = identifier;
        this.target = target;
        this.clientX = pos.clientX + deltaX;
        this.clientY = pos.clientY + deltaY;
        this.screenX = pos.screenX + deltaX;
        this.screenY = pos.screenY + deltaY;
        this.pageX = pos.pageX + deltaX;
        this.pageY = pos.pageY + deltaY;
    }

    /**
     * create empty touchlist with the methods
     * @constructor
     * @returns touchList
     */
    function TouchList() {
        const touchList = [];

        touchList.item = function( index ) {
            return this[ index ] || null;
        };

        return touchList;
    }

    /**
     * Simple trick to fake touch event support
     * this is enough for most libraries like Modernizr and Hammer
     */
    function fakeTouchSupport() {
        const objs = [ window, document.documentElement ];
        const props = [ 'ontouchstart', 'ontouchmove', 'ontouchcancel', 'ontouchend' ];

        for ( let o = 0; o < objs.length; o++ ) {
            for ( let p = 0; p < props.length; p++ ) {
                if ( objs[ o ] && objs[ o ][ props[ p ] ] === undefined ) {
                    objs[ o ][ props[ p ] ] = null;
                }
            }
        }
    }

    /**
     * disable mouseevents on the page
     * @param ev
     */
    function preventMouseEvents( ev ) {
        ev.preventDefault();
        ev.stopPropagation();
    }

    const ignoreTags = [ 'TEXTAREA', 'INPUT', 'SELECT' ];

    /**
     * only trigger touches when the left mousebutton has been pressed
     * @param touchType
     * @returns {Function}
     */
    function onMouse( touchType ) {
        return function( ev ) {
            if ( ignoreTags.indexOf( ev.target.tagName ) < 0 ) {
                // prevent mouse events
                preventMouseEvents( ev );
            }

            if ( ev.which !== 1 ) {
                return;
            }

            // The EventTarget on which the touch point started when it was first placed on the surface,
            // even if the touch point has since moved outside the interactive area of that element.
            // also, when the target doesnt exist anymore, we update it
            if ( ev.type === 'mousedown' || !eventTarget || ( eventTarget && !eventTarget.dispatchEvent ) ) {
                eventTarget = ev.target;
            }

            triggerTouch( touchType, ev );

            // reset
            if ( ev.type === 'mouseup' ) {
                eventTarget = null;
            }
        };
    }

    /**
     * trigger a touch event
     * @param eventName
     * @param mouseEv
     */
    function triggerTouch( eventName, mouseEv ) {
        const touchEvent = document.createEvent( 'Event' );
        touchEvent.initEvent( eventName, true, true );

        touchEvent.touches = getActiveTouches( mouseEv );
        touchEvent.targetTouches = getActiveTouches( mouseEv );
        touchEvent.changedTouches = createTouchList( mouseEv );

        eventTarget.dispatchEvent( touchEvent );
    }

    /**
     * create a touchList based on the mouse event
     * @param mouseEv
     * @returns {TouchList}
     */
    function createTouchList( mouseEv ) {
        const touchList = new TouchList();
        touchList.push( new Touch( eventTarget, 1, mouseEv, 0, 0 ) );
        return touchList;
    }

    /**
     * receive all active touches
     * @param mouseEv
     * @returns {TouchList}
     */
    function getActiveTouches( mouseEv ) {
        // empty list
        if ( mouseEv.type === 'mouseup' ) {
            return new TouchList();
        }

        return createTouchList( mouseEv );
    }

    let element = null;

    /**
     * show the touchpoints on the screen
     */
    function showTouches( ev ) {
        if ( !element ) {
            element = document.createElement( 'div' );
            const s = element.style;
            s.display = 'none';
            s.position = 'fixed';
            s.background = '#fff';
            s.border = 'solid 1px #999';
            s.opacity = 0.6;
            s.borderRadius = '100%';
            s.height = '30px';
            s.width = '30px';
            s.overflow = 'hidden';
            s.pointerEvents = 'none';
            s.userSelect = 'none';
            document.body.appendChild( element );
        }

        switch ( ev.type ) {
            case 'touchend':
                element.style.display = 'none';
                break;
            case 'touchstart':
                element.style.display = 'block';
                // fallthrough
            case 'touchmove':
                element.style.transform = 'translate(' + ( ev.touches[ 0 ].clientX - 15 ) + 'px, ' + ( ev.touches[ 0 ].clientY - 15 ) + 'px)';
        }
    }

    if ( 'ontouchstart' in window || navigator.maxTouchPoints > 2 ) {
        return;
    }

    Object.defineProperty( window.navigator, 'maxTouchPoints', {
        get: function() {
            return 2;
        },
    } );

    fakeTouchSupport();

    addEventListener( 'mousedown', onMouse( 'touchstart' ), true );
    addEventListener( 'mousemove', onMouse( 'touchmove' ), true );
    addEventListener( 'mouseup', onMouse( 'touchend' ), true );

    addEventListener( 'mouseenter', preventMouseEvents, true );
    addEventListener( 'mouseleave', preventMouseEvents, true );
    addEventListener( 'mouseout', preventMouseEvents, true );
    addEventListener( 'mouseover', preventMouseEvents, true );

    addEventListener( 'touchstart', showTouches, false );
    addEventListener( 'touchmove', showTouches, false );
    addEventListener( 'touchend', showTouches, false );
} )();
