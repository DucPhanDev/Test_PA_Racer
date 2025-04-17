window.Luna = {
    Unity: {
        Playable: {},

        LifeCycle: {
            OnStart: function() {},
            OnDeviceData: function() {},
            GameEnded: function() {},
            HapticTriggered: function() {},
            OnMute: function() {},
            OnUnmute: function() {},
            OnPause: function() {},
            OnResume: function() {},
            OnResize: function() {},
            OnLevelLoad: function() {},
        },

        Analytics: {},

        Playground: {
            get: function( className, fieldName, defaultValue, format ) {
                const assetName = fieldName.replace( 'asset/', '' );

                if ( window.playgroundAssetOverrides && window.playgroundAssetOverrides.hasOwnProperty( assetName ) ) {
                    return window.playgroundAssetOverrides[ assetName ];
                } else if ( !window.playgroundOverrides ||
                     !window.playgroundOverrides.hasOwnProperty( className ) ||
                     !window.playgroundOverrides[ className ].hasOwnProperty( fieldName ) ) {
                    return defaultValue;
                }

                const value = window.playgroundOverrides[ className ][ fieldName ];

                const formattedValue = ( value ) => {
                    switch ( value[ 0 ] ) {
                        case 'float':
                        case 'int':
                        case 'string':
                        case 'enum':
                            return value[ 1 ];

                        case 'boolean':
                            return typeof value[ 1 ] === 'object' ? value[ 1 ] : !!value[ 1 ];

                        case 'vector2':
                        case 'vector3':
                        case 'vector4':
                            return typeof value[ 1 ] === 'object' ? value[ 1 ] : value.slice( 1 );

                        case 'color':
                            if ( format === 'rgba' ) {
                                const r = ( ( value[ 1 ] * 255 ) | 0 ).toString( 16 );
                                const g = ( ( value[ 2 ] * 255 ) | 0 ).toString( 16 );
                                const b = ( ( value[ 3 ] * 255 ) | 0 ).toString( 16 );
                                const a = ( ( value[ 4 ] * 255 ) | 0 ).toString( 16 );

                                return '#' +
                                    ( r.length < 2 ? '0' : '' ) + r +
                                    ( g.length < 2 ? '0' : '' ) + g +
                                    ( b.length < 2 ? '0' : '' ) + b +
                                    ( a.length < 2 ? '0' : '' ) + a;
                            } else if ( typeof value[ 1 ] === 'object' ) {
                                return value[ 1 ];
                            } else {
                                return value.slice( 1 );
                            }

                        case 'float[]':
                        case 'int[]':
                        case 'string[]':
                        case 'enum[]':
                        case 'boolean[]':
                        case 'vector2[]':
                        case 'vector3[]':
                        case 'vector4[]':
                        case 'color[]':
                            return value.slice( 1 ).map( ( elementValue ) => formattedValue( [ value[ 0 ].replace( '[]', '' ), ...[ elementValue ].flat() ] ) );

                        default: return null;
                    }
                };

                return formattedValue( value );
            },
        },
    },
};

window.Bridge = {
    ready: function( callback ) {
        callback();
    },
};

window.addEventListener( 'DOMContentLoaded', () => {
    // We don't have luna scripts to wait for, dispatch ready event immediately.
    window.dispatchEvent( new Event( 'luna:ready' ) );
} );
