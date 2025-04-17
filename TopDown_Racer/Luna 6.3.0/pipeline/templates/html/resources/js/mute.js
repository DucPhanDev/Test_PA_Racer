( function() {
    window.addEventListener( 'luna:build', () => {
        let muted = false;
        const muteButton = document.getElementById( 'application-mute-button' );

        const audioButtonToggle = function( mute ) {
            if ( mute ) {
                muteButton.classList.add( 'checked' );
            } else {
                muteButton.classList.remove( 'checked' );
            }

            muted = mute;
        };

        muteButton.onclick = function() {
            if ( muted ) {
                window.dispatchEvent( new Event( 'luna:unmute' ) );
            } else {
                window.dispatchEvent( new Event( 'luna:mute' ) );
            }
        };

        window.addEventListener( 'luna:unmute', () => {
            audioButtonToggle( false );
        } );

        window.addEventListener( 'luna:mute', () => {
            audioButtonToggle( true );
        } );
    } );
} )();
