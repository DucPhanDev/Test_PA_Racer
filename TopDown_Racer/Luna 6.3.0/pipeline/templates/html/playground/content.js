function replaceElementText( id, value ) {
    document.getElementById( id ).innerText = value[ 1 ];
}

function replaceElementColor( id, value ) {
    const r = ( ( value[ 1 ] * 255 ) | 0 ).toString( 16 );
    const g = ( ( value[ 2 ] * 255 ) | 0 ).toString( 16 );
    const b = ( ( value[ 3 ] * 255 ) | 0 ).toString( 16 );
    const a = ( ( value[ 4 ] * 255 ) | 0 ).toString( 16 );

    const color = '#' +
        ( r.length < 2 ? '0' : '' ) + r +
        ( g.length < 2 ? '0' : '' ) + g +
        ( b.length < 2 ? '0' : '' ) + b +
        ( a.length < 2 ? '0' : '' ) + a;

    document.getElementById( id ).style.background = color;
}

function replaceElementSrc( id, value ) {
    const element = document.getElementById( id );

    // store the original src value be able to restore it later
    if ( !element.dataset.src ) {
        element.dataset.src = element.src;
    }

    element.src = value[ 1 ] || element.dataset.src || element.src;
}

function updatePreloader( data ) {
    document.getElementById( 'application-preloader' ).style.display = 'block';

    for ( const [ key, value ] of Object.entries( data ) ) {
        switch ( value[ 0 ] ) {
            case 'image':
                replaceElementSrc( key, value );
                break;
            case 'string':
                replaceElementText( key, value );
                break;
            case 'color':
                replaceElementColor( key, value );
                break;
            default:
        }
    }
}

window.addEventListener( 'message', ( json ) => {
    try {
        if ( typeof json.data !== 'string' ) {
            // PG events always have a string payload, we can safely ignore the event if it's not the case.
            return;
        }
        const event = JSON.parse( json.data );

        switch ( event.name ) {
            case 'setPlaygroundOverrides':
                window.playgroundOverrides = JSON.parse( event.data );
                break;
            case 'setPlaygroundBundleOverrides':
                window.playgroundBundlesOverrides = JSON.parse( event.data );
                break;
            case 'setPlaygroundAssetOverrides':
                window.playgroundAssetOverrides = JSON.parse( event.data );

                window.dispatchEvent( new Event( 'luna:build' ) );
                window.dispatchEvent( new Event( 'luna:start' ) );
                window.dispatchEvent( new Event( 'playground:started' ) );

                break;
            case 'setPlaygroundPreloaderOverrides':
                updatePreloader( JSON.parse( event.data ) );

                break;
            default:
        }
    } catch ( ex ) {
        // noop
    }
} );
