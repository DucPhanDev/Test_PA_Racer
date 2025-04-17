function replaceElementSrc( id, url ) {
    const normalizedId = id.replace( ':orientation-aware', '' );
    // find the element by well-known id convention
    const element = document.getElementById( `asset/${normalizedId}` );

    // check that the element exists and its src attribute contains Data URI
    if ( element && ( element.getAttribute( 'src' ).indexOf( 'data:' ) === 0 || element.getAttribute( 'src' ).indexOf( 'assets/' ) === 0 ) ) {
        return new Promise( ( resolve ) => {
            element.addEventListener( 'load', resolve );
            element.addEventListener( 'loadedmetadata', resolve );

            element.src = url;
        } );
    }

    return new Promise( ( resolve ) => resolve() );
}

window.addEventListener( 'message', ( json ) => {
    try {
        const event = JSON.parse( json.data );

        switch ( event.name ) {
            case 'setPlaygroundOverrides':
                window.playgroundOverrides = JSON.parse( event.data );
                break;
            case 'setPlaygroundBundleOverrides':
                window.playgroundBundlesOverrides = JSON.parse( event.data );
                break;
            case 'setPlaygroundAssetOverrides': {
                window.playgroundAssetOverrides = JSON.parse( event.data );

                // replace all elements' src attributes and await for the loading
                const promises = Object.entries( window.playgroundAssetOverrides ).map( ( [ id, url ] ) => {
                    if ( typeof url === 'object' ) {
                        return Object.keys( url ).filter( ( orientation ) => url[ orientation ] )
                            .forEach( ( orientation ) => {
                                const orientationId = [ id, orientation ].filter( Boolean ).join( '-' );
                                return replaceElementSrc( orientationId, url[ orientation ] );
                            } );
                    } else {
                        return replaceElementSrc( id, url );
                    }
                } );

                // await for all resources to load and start the game
                Promise.all( promises ).then( () => {
                    startGame();
                    window.dispatchEvent( new Event( 'playground:started' ) );
                } );

                break;
            }
            default:
        }
    } catch ( ex ) {
        // noop
    }
} );
