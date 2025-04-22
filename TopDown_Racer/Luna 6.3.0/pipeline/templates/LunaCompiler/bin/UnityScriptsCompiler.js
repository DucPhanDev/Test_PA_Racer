/**
 * @version 1.0.9244.20
 * @copyright anton
 * @compiler Bridge.NET 17.9.42-luna
 */
Bridge.assembly("UnityScriptsCompiler", function ($asm, globals) {
    "use strict";

    /*AICarController start.*/
    Bridge.define("AICarController", {
        inherits: [UnityEngine.MonoBehaviour],
        fields: {
            constantForwardForce: 0,
            maxSpeed: 0,
            steerStrength: 0,
            brakeStrength: 0,
            baseGrip: 0,
            driftGripMultiplier: 0,
            driftTorqueMultiplier: 0,
            kickOutForce: 0,
            kickOutSpeedThreshold: 0,
            kickOutSteerThreshold: 0,
            sensorLength: 0,
            waypoints: null,
            waypointReachThreshold: 0,
            rb: null,
            currentWaypointIndex: 0,
            steerAmount: 0,
            currentGrip: 0,
            targetDirection: null
        },
        ctors: {
            init: function () {
                this.targetDirection = new UnityEngine.Vector3();
                this.constantForwardForce = 10000.0;
                this.maxSpeed = 20.0;
                this.steerStrength = 20000.0;
                this.brakeStrength = 30.0;
                this.baseGrip = 1.0;
                this.driftGripMultiplier = 0.8;
                this.driftTorqueMultiplier = 0.2;
                this.kickOutForce = 5E+07;
                this.kickOutSpeedThreshold = 20.0;
                this.kickOutSteerThreshold = 0.5;
                this.sensorLength = 5.0;
                this.waypointReachThreshold = 5.0;
                this.currentWaypointIndex = 0;
            }
        },
        methods: {
            /*AICarController.Awake start.*/
            Awake: function () {
                this.rb = this.GetComponent(UnityEngine.Rigidbody);
                this.currentGrip = this.baseGrip;
            },
            /*AICarController.Awake end.*/

            /*AICarController.FixedUpdate start.*/
            FixedUpdate: function () {
                if (!SystemManager.Instance.GameStarted || SystemManager.Instance.GameEnded) {
                    return;
                }
                this.UpdateWaypointTarget();
                this.HandleSensor();
                this.HandleMovement();
                this.HandleDrift();
            },
            /*AICarController.FixedUpdate end.*/

            /*AICarController.UpdateWaypointTarget start.*/
            UpdateWaypointTarget: function () {
                if (this.waypoints == null || this.waypoints.Count === 0) {
                    return;
                }
                if (this.currentWaypointIndex >= this.waypoints.Count) {
                    return;
                }

                var toWaypoint = this.waypoints.getItem(this.currentWaypointIndex).position.$clone().sub( this.transform.position );
                if (toWaypoint.length() < this.waypointReachThreshold) {
                    this.currentWaypointIndex = (this.currentWaypointIndex + 1) | 0;


                    if (this.currentWaypointIndex >= this.waypoints.Count) {
                        this.currentWaypointIndex = this.waypoints.Count;
                        this.targetDirection = pc.Vec3.ZERO.clone();
                        return;
                    }
                }

                this.targetDirection = (this.waypoints.getItem(this.currentWaypointIndex).position.$clone().sub( this.transform.position )).clone().normalize().$clone();
            },
            /*AICarController.UpdateWaypointTarget end.*/

            /*AICarController.HandleSensor start.*/
            HandleSensor: function () {
                var left = this.transform.position.$clone().sub( this.transform.right.$clone().clone().scale( 1.5 ) );
                var right = this.transform.position.$clone().add( this.transform.right.$clone().clone().scale( 1.5 ) );
                var forward = this.transform.position.$clone().add( this.transform.forward.$clone().clone().scale( 1.5 ) );
                var _discard1 = { v : new UnityEngine.RaycastHit() };

                var hitLeft = UnityEngine.Physics.Raycast$3(left, this.transform.forward, _discard1, this.sensorLength);
                var _discard2 = { v : new UnityEngine.RaycastHit() };
                var hitRight = UnityEngine.Physics.Raycast$3(right, this.transform.forward, _discard2, this.sensorLength);
                var _discard3 = { v : new UnityEngine.RaycastHit() };
                var hitCenter = UnityEngine.Physics.Raycast$3(forward, this.transform.forward, _discard3, this.sensorLength);

                var avoidDirection = pc.Vec3.ZERO.clone();

                if (hitLeft) {
                    avoidDirection = avoidDirection.$clone().add( this.transform.right.$clone() );
                }
                if (hitRight) {
                    avoidDirection = avoidDirection.$clone().sub( this.transform.right.$clone() );
                }
                if (!hitLeft && !hitRight && hitCenter) {
                    avoidDirection = avoidDirection.$clone().sub( this.transform.right.$clone() );
                }

                // Blend avoidance with waypoint steering
                var combinedDir = (this.targetDirection.$clone().add( avoidDirection )).clone().normalize().$clone();
                var localTargetDir = this.transform.InverseTransformDirection(combinedDir);
                this.steerAmount = Math.max(-1.0, Math.min(localTargetDir.x, 1.0));
            },
            /*AICarController.HandleSensor end.*/

            /*AICarController.HandleMovement start.*/
            HandleMovement: function () {
                var forwardForce = this.transform.forward.$clone().clone().scale( this.constantForwardForce ).clone().scale( UnityEngine.Time.fixedDeltaTime );
                this.rb.AddForce$1(forwardForce, UnityEngine.ForceMode.Force);

                if (this.rb.velocity.length() > this.maxSpeed) {
                    this.rb.velocity = this.rb.velocity.clone().normalize().$clone().clone().scale( this.maxSpeed );
                }

                this.rb.AddTorque$1(this.transform.up.$clone().clone().scale( this.steerAmount ).clone().scale( this.steerStrength ).clone().scale( UnityEngine.Time.fixedDeltaTime ), UnityEngine.ForceMode.Force);
            },
            /*AICarController.HandleMovement end.*/

            /*AICarController.HandleDrift start.*/
            HandleDrift: function () {
                var rightVelocity = this.rb.velocity.$clone().project( this.transform.right );

                this.currentGrip = this.baseGrip;
                if (Math.abs(this.steerAmount) > 0.5) {
                    this.currentGrip *= this.driftGripMultiplier;

                    if (this.rb.velocity.length() > this.kickOutSpeedThreshold) {
                        this.rb.AddForce$1(this.transform.right.$clone().clone().scale( this.steerAmount ).clone().scale( this.kickOutForce ).clone().scale( UnityEngine.Time.fixedDeltaTime ), UnityEngine.ForceMode.Force);
                    }
                }

                this.rb.velocity = this.rb.velocity.$clone().sub( rightVelocity.$clone().clone().scale( (1.0 - this.currentGrip) ) );
                this.rb.angularVelocity = this.rb.angularVelocity.$clone().clone().scale( this.currentGrip );
            },
            /*AICarController.HandleDrift end.*/


        }
    });
    /*AICarController end.*/

    /*AudioManager start.*/
    Bridge.define("AudioManager", {
        inherits: [UnityEngine.MonoBehaviour],
        statics: {
            fields: {
                instance: null
            },
            props: {
                Instance: {
                    get: function () {
                        return AudioManager.instance;
                    }
                }
            }
        },
        fields: {
            audClip_ClickBtn: null
        },
        methods: {
            /*AudioManager.Awake start.*/
            Awake: function () {
                AudioManager.instance = this;
            },
            /*AudioManager.Awake end.*/


        }
    });
    /*AudioManager end.*/

    /*AxisOptions start.*/
    Bridge.define("AxisOptions", {
        $kind: 6,
        statics: {
            fields: {
                Both: 0,
                Horizontal: 1,
                Vertical: 2
            }
        }
    });
    /*AxisOptions end.*/

    /*Camera_Follow start.*/
    Bridge.define("Camera_Follow", {
        inherits: [UnityEngine.MonoBehaviour],
        fields: {
            mainCamera: null,
            offset: null,
            transTarget: null,
            moveSpeed: 0
        },
        ctors: {
            init: function () {
                this.offset = new UnityEngine.Vector3();
                this.moveSpeed = 2.0;
            }
        },
        methods: {
            /*Camera_Follow.Awake start.*/
            Awake: function () {
                this.offset = this.transform.position.$clone().sub( this.transTarget.position );
            },
            /*Camera_Follow.Awake end.*/

            /*Camera_Follow.LateUpdate start.*/
            LateUpdate: function () {
                this.transform.position = new pc.Vec3().lerp( this.transform.position, this.transTarget.position.$clone().add( this.offset ), UnityEngine.Time.deltaTime * this.moveSpeed );
            },
            /*Camera_Follow.LateUpdate end.*/

            /*Camera_Follow.Update start.*/
            Update: function () {
                var screenRatio = (((Bridge.Int.div(UnityEngine.Screen.width, UnityEngine.Screen.height)) | 0));
                if (screenRatio >= 1) {
                    // Landscape Layout
                    this.mainCamera.fieldOfView = 55;
                } else if (screenRatio < 1) {
                    // Portrait Layout
                    this.mainCamera.fieldOfView = 70;
                }
            },
            /*Camera_Follow.Update end.*/


        }
    });
    /*Camera_Follow end.*/
    /** @namespace System */

    /**
     * @memberof System
     * @callback System.Action
     * @param   {DG.Tweening.DOTweenAnimation}    arg
     * @return  {void}
     */


    /*DG.Tweening.DOTweenAnimation start.*/
    /** @namespace DG.Tweening */

    /**
     * Attach this to a GameObject to create a tween
     *
     * @public
     * @class DG.Tweening.DOTweenAnimation
     * @augments DG.Tweening.Core.ABSAnimationComponent
     */
    Bridge.define("DG.Tweening.DOTweenAnimation", {
        inherits: [DG.Tweening.Core.ABSAnimationComponent],
        statics: {
            events: {
                /**
                 * Used internally by the editor
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenAnimation
                 * @memberof DG.Tweening.DOTweenAnimation
                 * @function addOnReset
                 * @param   {System.Action}    value
                 * @return  {void}
                 */
                /**
                 * Used internally by the editor
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenAnimation
                 * @memberof DG.Tweening.DOTweenAnimation
                 * @function removeOnReset
                 * @param   {System.Action}    value
                 * @return  {void}
                 */
                OnReset: null
            },
            methods: {
                /*DG.Tweening.DOTweenAnimation.Dispatch_OnReset:static start.*/
                Dispatch_OnReset: function (anim) {
                    if (!Bridge.staticEquals(DG.Tweening.DOTweenAnimation.OnReset, null)) {
                        DG.Tweening.DOTweenAnimation.OnReset(anim);
                    }
                },
                /*DG.Tweening.DOTweenAnimation.Dispatch_OnReset:static end.*/

                /*DG.Tweening.DOTweenAnimation.TypeToDOTargetType:static start.*/
                TypeToDOTargetType: function (t) {
                    var str = Bridge.getTypeName(t);
                    var dotIndex = str.lastIndexOf(".");
                    if (dotIndex !== -1) {
                        str = str.substr(((dotIndex + 1) | 0));
                    }
                    if (System.String.indexOf(str, "Renderer") !== -1 && (!Bridge.referenceEquals(str, "SpriteRenderer"))) {
                        str = "Renderer";
                    }
                    //#if true // PHYSICS_MARKER
                    //            if (str == "Rigidbody") str = "Transform";
                    //#endif
                    //#if true // PHYSICS2D_MARKER
                    //            if (str == "Rigidbody2D") str = "Transform";
                    //#endif
                    //            if (str == "RectTransform") str = "Transform";
                    if (Bridge.referenceEquals(str, "RawImage") || Bridge.referenceEquals(str, "Graphic")) {
                        str = "Image";
                    } // RawImages/Graphics are managed like Images for DOTweenAnimation (color and fade use Graphic target anyway)
                    return System.Nullable.getValue(Bridge.cast(Bridge.unbox(System.Enum.parse(DG.Tweening.DOTweenAnimation.TargetType, str), DG.Tweening.DOTweenAnimation.TargetType), System.Int32));
                },
                /*DG.Tweening.DOTweenAnimation.TypeToDOTargetType:static end.*/


            }
        },
        fields: {
            targetIsSelf: false,
            targetGO: null,
            tweenTargetIsTargetGO: false,
            delay: 0,
            duration: 0,
            easeType: 0,
            easeCurve: null,
            loopType: 0,
            loops: 0,
            id: null,
            isRelative: false,
            isFrom: false,
            isIndependentUpdate: false,
            autoKill: false,
            autoGenerate: false,
            isActive: false,
            isValid: false,
            target: null,
            animationType: 0,
            targetType: 0,
            forcedTargetType: 0,
            autoPlay: false,
            useTargetAsV3: false,
            endValueFloat: 0,
            endValueV3: null,
            endValueV2: null,
            endValueColor: null,
            endValueString: null,
            endValueRect: null,
            endValueTransform: null,
            optionalBool0: false,
            optionalBool1: false,
            optionalFloat0: 0,
            optionalInt0: 0,
            optionalRotationMode: 0,
            optionalScrambleMode: 0,
            optionalShakeRandomnessMode: 0,
            optionalString: null,
            _tweenAutoGenerationCalled: false,
            _playCount: 0
        },
        ctors: {
            init: function () {
                this.endValueV3 = new UnityEngine.Vector3();
                this.endValueV2 = new UnityEngine.Vector2();
                this.endValueColor = new UnityEngine.Color();
                this.endValueRect = new UnityEngine.Rect();
                this.targetIsSelf = true;
                this.tweenTargetIsTargetGO = true;
                this.duration = 1;
                this.easeType = DG.Tweening.Ease.OutQuad;
                this.easeCurve = new pc.AnimationCurve({keyframes: [ new pc.Keyframe(0, 0, 0, 0), new pc.Keyframe(1, 1, 0, 0) ]});
                this.loopType = DG.Tweening.LoopType.Restart;
                this.loops = 1;
                this.id = "";
                this.isIndependentUpdate = false;
                this.autoKill = true;
                this.autoGenerate = true;
                this.isActive = true;
                this.autoPlay = true;
                this.endValueColor = new pc.Color( 1, 1, 1, 1 );
                this.endValueString = "";
                this.endValueRect = new UnityEngine.Rect.$ctor1(0, 0, 0, 0);
                this.optionalRotationMode = DG.Tweening.RotateMode.Fast;
                this.optionalScrambleMode = DG.Tweening.ScrambleMode.None;
                this.optionalShakeRandomnessMode = DG.Tweening.ShakeRandomnessMode.Full;
                this._playCount = -1;
            }
        },
        methods: {
            /*DG.Tweening.DOTweenAnimation.Awake start.*/
            Awake: function () {
                if (!this.isActive || !this.autoGenerate) {
                    return;
                }

                if (this.animationType !== DG.Tweening.DOTweenAnimation.AnimationType.Move || !this.useTargetAsV3) {
                    // Don't create tweens if we're using a RectTransform as a Move target,
                    // because that will work only inside Start
                    this.CreateTween(false, this.autoPlay);
                    this._tweenAutoGenerationCalled = true;
                }
            },
            /*DG.Tweening.DOTweenAnimation.Awake end.*/

            /*DG.Tweening.DOTweenAnimation.Start start.*/
            Start: function () {
                if (this._tweenAutoGenerationCalled || !this.isActive || !this.autoGenerate) {
                    return;
                }

                this.CreateTween(false, this.autoPlay);
                this._tweenAutoGenerationCalled = true;
            },
            /*DG.Tweening.DOTweenAnimation.Start end.*/

            /*DG.Tweening.DOTweenAnimation.Reset start.*/
            Reset: function () {
                DG.Tweening.DOTweenAnimation.Dispatch_OnReset(this);
            },
            /*DG.Tweening.DOTweenAnimation.Reset end.*/

            /*DG.Tweening.DOTweenAnimation.OnDestroy start.*/
            OnDestroy: function () {
                if (this.tween != null && this.tween.active) {
                    DG.Tweening.TweenExtensions.Kill(this.tween);
                }
                this.tween = null;
            },
            /*DG.Tweening.DOTweenAnimation.OnDestroy end.*/

            /*DG.Tweening.DOTweenAnimation.RewindThenRecreateTween start.*/
            /**
             * Creates/recreates the tween without playing it, but first rewinding and killing the existing one if present.
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            RewindThenRecreateTween: function () {
                if (this.tween != null && this.tween.active) {
                    DG.Tweening.TweenExtensions.Rewind(this.tween);
                }
                this.CreateTween(true, false);
            },
            /*DG.Tweening.DOTweenAnimation.RewindThenRecreateTween end.*/

            /*DG.Tweening.DOTweenAnimation.RewindThenRecreateTweenAndPlay start.*/
            /**
             * Creates/recreates the tween and plays it, first rewinding and killing the existing one if present.
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            RewindThenRecreateTweenAndPlay: function () {
                if (this.tween != null && this.tween.active) {
                    DG.Tweening.TweenExtensions.Rewind(this.tween);
                }
                this.CreateTween(true, true);
            },
            /*DG.Tweening.DOTweenAnimation.RewindThenRecreateTweenAndPlay end.*/

            /*DG.Tweening.DOTweenAnimation.RecreateTween start.*/
            /**
             * Creates/recreates the tween from its target's current value without playing it, but first killing the existing one if present.
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            RecreateTween: function () {
                this.CreateTween(true, false);
            },
            /*DG.Tweening.DOTweenAnimation.RecreateTween end.*/

            /*DG.Tweening.DOTweenAnimation.RecreateTweenAndPlay start.*/
            /**
             * Creates/recreates the tween from its target's current value and plays it, first killing the existing one if present.
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            RecreateTweenAndPlay: function () {
                this.CreateTween(true, true);
            },
            /*DG.Tweening.DOTweenAnimation.RecreateTweenAndPlay end.*/

            /*DG.Tweening.DOTweenAnimation.CreateTween start.*/
            /**
             * Creates the tween manually (called automatically if AutoGenerate is set in the Inspector)
             from its target's current value.
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {boolean}    regenerateIfExists    If TRUE and an existing tween was already created (and not killed), kills it and recreates it with the current
             parameters. Otherwise, if a tween already exists, does nothing.
             * @param   {boolean}    andPlay               If TRUE also plays the tween, otherwise only creates it
             * @return  {void}
             */
            CreateTween: function (regenerateIfExists, andPlay) {
                if (regenerateIfExists === void 0) { regenerateIfExists = false; }
                if (andPlay === void 0) { andPlay = true; }
                if (!this.isValid) {
                    if (regenerateIfExists) { // Called manually: warn users
                        UnityEngine.Debug.LogWarning$1(System.String.format("{0} :: This DOTweenAnimation isn't valid and its tween won't be created", [this.gameObject.name]), this.gameObject);
                    }
                    return;
                }
                if (this.tween != null) {
                    if (this.tween.active) {
                        if (regenerateIfExists) {
                            DG.Tweening.TweenExtensions.Kill(this.tween);
                        } else {
                            return;
                        }
                    }
                    this.tween = null;
                }

                //            if (target == null) {
                //                Debug.LogWarning(string.Format("{0} :: This DOTweenAnimation's target is NULL, because the animation was created with a DOTween Pro version older than 0.9.255. To fix this, exit Play mode then simply select this object, and it will update automatically", this.gameObject.name), this.gameObject);
                //                return;
                //            }

                var tweenGO = this.GetTweenGO();
                if (UnityEngine.Component.op_Equality(this.target, null) || UnityEngine.GameObject.op_Equality(tweenGO, null)) {
                    if (this.targetIsSelf && UnityEngine.Component.op_Equality(this.target, null)) {
                        // Old error caused during upgrade from DOTween Pro 0.9.255
                        UnityEngine.Debug.LogWarning$1(System.String.format("{0} :: This DOTweenAnimation's target is NULL, because the animation was created with a DOTween Pro version older than 0.9.255. To fix this, exit Play mode then simply select this object, and it will update automatically", [this.gameObject.name]), this.gameObject);
                    } else {
                        // Missing non-self target
                        UnityEngine.Debug.LogWarning$1(System.String.format("{0} :: This DOTweenAnimation's target/GameObject is unset: the tween will not be created.", [this.gameObject.name]), this.gameObject);
                    }
                    return;
                }

                if (this.forcedTargetType !== DG.Tweening.DOTweenAnimation.TargetType.Unset) {
                    this.targetType = this.forcedTargetType;
                }
                if (this.targetType === DG.Tweening.DOTweenAnimation.TargetType.Unset) {
                    // Legacy DOTweenAnimation (made with a version older than 0.9.450) without stored targetType > assign it now
                    this.targetType = DG.Tweening.DOTweenAnimation.TypeToDOTargetType(Bridge.getType(this.target));
                }

                switch (this.animationType) {
                    case DG.Tweening.DOTweenAnimation.AnimationType.None: 
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.Move: 
                        if (this.useTargetAsV3) {
                            this.isRelative = false;
                            if (UnityEngine.Component.op_Equality(this.endValueTransform, null)) {
                                UnityEngine.Debug.LogWarning$1(System.String.format("{0} :: This tween's TO target is NULL, a Vector3 of (0,0,0) will be used instead", [this.gameObject.name]), this.gameObject);
                                this.endValueV3 = pc.Vec3.ZERO.clone();
                            } else {
                                if (this.targetType === DG.Tweening.DOTweenAnimation.TargetType.RectTransform) {
                                    var endValueT = Bridge.as(this.endValueTransform, UnityEngine.RectTransform);
                                    if (UnityEngine.Component.op_Equality(endValueT, null)) {
                                        UnityEngine.Debug.LogWarning$1(System.String.format("{0} :: This tween's TO target should be a RectTransform, a Vector3 of (0,0,0) will be used instead", [this.gameObject.name]), this.gameObject);
                                        this.endValueV3 = pc.Vec3.ZERO.clone();
                                    } else {
                                        var rTarget = Bridge.as(this.target, UnityEngine.RectTransform);
                                        if (UnityEngine.Component.op_Equality(rTarget, null)) {
                                            UnityEngine.Debug.LogWarning$1(System.String.format("{0} :: This tween's target and TO target are not of the same type. Please reassign the values", [this.gameObject.name]), this.gameObject);
                                        } else {
                                            // Problem: doesn't work inside Awake (ararargh!)
                                            this.endValueV3 = UnityEngine.Vector3.FromVector2(DG.Tweening.DOTweenModuleUI.Utils.SwitchToRectTransform(endValueT, rTarget));
                                        }
                                    }
                                } else {
                                    this.endValueV3 = this.endValueTransform.position.$clone();
                                }
                            }
                        }
                        switch (this.targetType) {
                            case DG.Tweening.DOTweenAnimation.TargetType.Transform: 
                                this.tween = DG.Tweening.ShortcutExtensions.DOMove(Bridge.cast(this.target, UnityEngine.Transform), this.endValueV3.$clone(), this.duration, this.optionalBool0);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.RectTransform: 
                                this.tween = DG.Tweening.DOTweenModuleUI.DOAnchorPos3D(Bridge.cast(this.target, UnityEngine.RectTransform), this.endValueV3.$clone(), this.duration, this.optionalBool0);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Rigidbody: 
                                this.tween = DG.Tweening.DOTweenModulePhysics.DOMove(Bridge.cast(this.target, UnityEngine.Rigidbody), this.endValueV3.$clone(), this.duration, this.optionalBool0);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Rigidbody2D: 
                                this.tween = DG.Tweening.DOTweenModulePhysics2D.DOMove(Bridge.cast(this.target, UnityEngine.Rigidbody2D), UnityEngine.Vector2.FromVector3(this.endValueV3.$clone()), this.duration, this.optionalBool0);
                                break;
                        }
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.LocalMove: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOLocalMove(tweenGO.transform, this.endValueV3.$clone(), this.duration, this.optionalBool0);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.Rotate: 
                        switch (this.targetType) {
                            case DG.Tweening.DOTweenAnimation.TargetType.Transform: 
                                this.tween = DG.Tweening.ShortcutExtensions.DORotate(Bridge.cast(this.target, UnityEngine.Transform), this.endValueV3.$clone(), this.duration, this.optionalRotationMode);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Rigidbody: 
                                this.tween = DG.Tweening.DOTweenModulePhysics.DORotate(Bridge.cast(this.target, UnityEngine.Rigidbody), this.endValueV3.$clone(), this.duration, this.optionalRotationMode);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Rigidbody2D: 
                                this.tween = DG.Tweening.DOTweenModulePhysics2D.DORotate(Bridge.cast(this.target, UnityEngine.Rigidbody2D), this.endValueFloat, this.duration);
                                break;
                        }
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.LocalRotate: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOLocalRotate(tweenGO.transform, this.endValueV3.$clone(), this.duration, this.optionalRotationMode);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.Scale: 
                        switch (this.targetType) {
                            default: 
                                this.tween = DG.Tweening.ShortcutExtensions.DOScale$1(tweenGO.transform, this.optionalBool0 ? new pc.Vec3( this.endValueFloat, this.endValueFloat, this.endValueFloat ) : this.endValueV3.$clone(), this.duration);
                                break;
                        }
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.UIWidthHeight: 
                        this.tween = DG.Tweening.DOTweenModuleUI.DOSizeDelta(Bridge.cast(this.target, UnityEngine.RectTransform), this.optionalBool0 ? new pc.Vec2( this.endValueFloat, this.endValueFloat ) : this.endValueV2.$clone(), this.duration);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.Color: 
                        this.isRelative = false;
                        switch (this.targetType) {
                            case DG.Tweening.DOTweenAnimation.TargetType.Renderer: 
                                this.tween = DG.Tweening.ShortcutExtensions.DOColor$3(Bridge.cast(this.target, UnityEngine.Renderer).material, this.endValueColor.$clone(), this.duration);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Light: 
                                this.tween = DG.Tweening.ShortcutExtensions.DOColor$1(Bridge.cast(this.target, UnityEngine.Light), this.endValueColor.$clone(), this.duration);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.SpriteRenderer: 
                                this.tween = DG.Tweening.DOTweenModuleSprite.DOColor(Bridge.cast(this.target, UnityEngine.SpriteRenderer), this.endValueColor.$clone(), this.duration);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Image: 
                                this.tween = DG.Tweening.DOTweenModuleUI.DOColor(Bridge.cast(this.target, UnityEngine.UI.Graphic), this.endValueColor.$clone(), this.duration);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Text: 
                                this.tween = DG.Tweening.DOTweenModuleUI.DOColor$3(Bridge.cast(this.target, UnityEngine.UI.Text), this.endValueColor.$clone(), this.duration);
                                break;
                        }
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.Fade: 
                        this.isRelative = false;
                        switch (this.targetType) {
                            case DG.Tweening.DOTweenAnimation.TargetType.Renderer: 
                                this.tween = DG.Tweening.ShortcutExtensions.DOFade$1(Bridge.cast(this.target, UnityEngine.Renderer).material, this.endValueFloat, this.duration);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Light: 
                                this.tween = DG.Tweening.ShortcutExtensions.DOIntensity(Bridge.cast(this.target, UnityEngine.Light), this.endValueFloat, this.duration);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.SpriteRenderer: 
                                this.tween = DG.Tweening.DOTweenModuleSprite.DOFade(Bridge.cast(this.target, UnityEngine.SpriteRenderer), this.endValueFloat, this.duration);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Image: 
                                this.tween = DG.Tweening.DOTweenModuleUI.DOFade$1(Bridge.cast(this.target, UnityEngine.UI.Graphic), this.endValueFloat, this.duration);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.Text: 
                                this.tween = DG.Tweening.DOTweenModuleUI.DOFade$4(Bridge.cast(this.target, UnityEngine.UI.Text), this.endValueFloat, this.duration);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.CanvasGroup: 
                                this.tween = DG.Tweening.DOTweenModuleUI.DOFade(Bridge.cast(this.target, UnityEngine.CanvasGroup), this.endValueFloat, this.duration);
                                break;
                        }
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.Text: 
                        switch (this.targetType) {
                            case DG.Tweening.DOTweenAnimation.TargetType.Text: 
                                this.tween = DG.Tweening.DOTweenModuleUI.DOText(Bridge.cast(this.target, UnityEngine.UI.Text), this.endValueString, this.duration, this.optionalBool0, this.optionalScrambleMode, this.optionalString);
                                break;
                        }
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.PunchPosition: 
                        switch (this.targetType) {
                            case DG.Tweening.DOTweenAnimation.TargetType.Transform: 
                                this.tween = DG.Tweening.ShortcutExtensions.DOPunchPosition(Bridge.cast(this.target, UnityEngine.Transform), this.endValueV3.$clone(), this.duration, this.optionalInt0, this.optionalFloat0, this.optionalBool0);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.RectTransform: 
                                this.tween = DG.Tweening.DOTweenModuleUI.DOPunchAnchorPos(Bridge.cast(this.target, UnityEngine.RectTransform), UnityEngine.Vector2.FromVector3(this.endValueV3.$clone()), this.duration, this.optionalInt0, this.optionalFloat0, this.optionalBool0);
                                break;
                        }
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.PunchScale: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOPunchScale(tweenGO.transform, this.endValueV3.$clone(), this.duration, this.optionalInt0, this.optionalFloat0);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.PunchRotation: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOPunchRotation(tweenGO.transform, this.endValueV3.$clone(), this.duration, this.optionalInt0, this.optionalFloat0);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.ShakePosition: 
                        switch (this.targetType) {
                            case DG.Tweening.DOTweenAnimation.TargetType.Transform: 
                                this.tween = DG.Tweening.ShortcutExtensions.DOShakePosition$3(Bridge.cast(this.target, UnityEngine.Transform), this.duration, this.endValueV3.$clone(), this.optionalInt0, this.optionalFloat0, this.optionalBool0, this.optionalBool1, this.optionalShakeRandomnessMode);
                                break;
                            case DG.Tweening.DOTweenAnimation.TargetType.RectTransform: 
                                this.tween = DG.Tweening.DOTweenModuleUI.DOShakeAnchorPos$1(Bridge.cast(this.target, UnityEngine.RectTransform), this.duration, UnityEngine.Vector2.FromVector3(this.endValueV3.$clone()), this.optionalInt0, this.optionalFloat0, this.optionalBool0, this.optionalBool1, this.optionalShakeRandomnessMode);
                                break;
                        }
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.ShakeScale: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOShakeScale$1(tweenGO.transform, this.duration, this.endValueV3.$clone(), this.optionalInt0, this.optionalFloat0, this.optionalBool1, this.optionalShakeRandomnessMode);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.ShakeRotation: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOShakeRotation$3(tweenGO.transform, this.duration, this.endValueV3.$clone(), this.optionalInt0, this.optionalFloat0, this.optionalBool1, this.optionalShakeRandomnessMode);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.CameraAspect: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOAspect(Bridge.cast(this.target, UnityEngine.Camera), this.endValueFloat, this.duration);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.CameraBackgroundColor: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOColor(Bridge.cast(this.target, UnityEngine.Camera), this.endValueColor.$clone(), this.duration);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.CameraFieldOfView: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOFieldOfView(Bridge.cast(this.target, UnityEngine.Camera), this.endValueFloat, this.duration);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.CameraOrthoSize: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOOrthoSize(Bridge.cast(this.target, UnityEngine.Camera), this.endValueFloat, this.duration);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.CameraPixelRect: 
                        this.tween = DG.Tweening.ShortcutExtensions.DOPixelRect(Bridge.cast(this.target, UnityEngine.Camera), this.endValueRect.$clone(), this.duration);
                        break;
                    case DG.Tweening.DOTweenAnimation.AnimationType.CameraRect: 
                        this.tween = DG.Tweening.ShortcutExtensions.DORect(Bridge.cast(this.target, UnityEngine.Camera), this.endValueRect.$clone(), this.duration);
                        break;
                }

                if (this.tween == null) {
                    return;
                }

                // Created

                if (this.isFrom) {
                    DG.Tweening.TweenSettingsExtensions.From$1(DG.Tweening.Tweener, Bridge.cast(this.tween, DG.Tweening.Tweener), this.isRelative);
                } else {
                    DG.Tweening.TweenSettingsExtensions.SetRelative$1(DG.Tweening.Tween, this.tween, this.isRelative);
                }
                var setTarget = this.GetTweenTarget();
                DG.Tweening.TweenSettingsExtensions.OnKill(DG.Tweening.Tween, DG.Tweening.TweenSettingsExtensions.SetAutoKill$1(DG.Tweening.Tween, DG.Tweening.TweenSettingsExtensions.SetLoops$1(DG.Tweening.Tween, DG.Tweening.TweenSettingsExtensions.SetDelay(DG.Tweening.Tween, DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tween, this.tween, setTarget), this.delay), this.loops, this.loopType), this.autoKill), Bridge.fn.bind(this, function () {
                    this.tween = null;
                }));
                if (this.isSpeedBased) {
                    DG.Tweening.TweenSettingsExtensions.SetSpeedBased(DG.Tweening.Tween, this.tween);
                }
                if (this.easeType === DG.Tweening.Ease.INTERNAL_Custom) {
                    DG.Tweening.TweenSettingsExtensions.SetEase(DG.Tweening.Tween, this.tween, this.easeCurve);
                } else {
                    DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Tween, this.tween, this.easeType);
                }
                if (!System.String.isNullOrEmpty(this.id)) {
                    DG.Tweening.TweenSettingsExtensions.SetId$2(DG.Tweening.Tween, this.tween, this.id);
                }
                DG.Tweening.TweenSettingsExtensions.SetUpdate(DG.Tweening.Tween, this.tween, this.isIndependentUpdate);

                if (this.hasOnStart) {
                    if (this.onStart != null) {
                        DG.Tweening.TweenSettingsExtensions.OnStart(DG.Tweening.Tween, this.tween, Bridge.fn.cacheBind(this.onStart, this.onStart.Invoke));
                    }
                } else {
                    this.onStart = null;
                }
                if (this.hasOnPlay) {
                    if (this.onPlay != null) {
                        DG.Tweening.TweenSettingsExtensions.OnPlay(DG.Tweening.Tween, this.tween, Bridge.fn.cacheBind(this.onPlay, this.onPlay.Invoke));
                    }
                } else {
                    this.onPlay = null;
                }
                if (this.hasOnUpdate) {
                    if (this.onUpdate != null) {
                        DG.Tweening.TweenSettingsExtensions.OnUpdate(DG.Tweening.Tween, this.tween, Bridge.fn.cacheBind(this.onUpdate, this.onUpdate.Invoke));
                    }
                } else {
                    this.onUpdate = null;
                }
                if (this.hasOnStepComplete) {
                    if (this.onStepComplete != null) {
                        DG.Tweening.TweenSettingsExtensions.OnStepComplete(DG.Tweening.Tween, this.tween, Bridge.fn.cacheBind(this.onStepComplete, this.onStepComplete.Invoke));
                    }
                } else {
                    this.onStepComplete = null;
                }
                if (this.hasOnComplete) {
                    if (this.onComplete != null) {
                        DG.Tweening.TweenSettingsExtensions.OnComplete(DG.Tweening.Tween, this.tween, Bridge.fn.cacheBind(this.onComplete, this.onComplete.Invoke));
                    }
                } else {
                    this.onComplete = null;
                }
                if (this.hasOnRewind) {
                    if (this.onRewind != null) {
                        DG.Tweening.TweenSettingsExtensions.OnRewind(DG.Tweening.Tween, this.tween, Bridge.fn.cacheBind(this.onRewind, this.onRewind.Invoke));
                    }
                } else {
                    this.onRewind = null;
                }

                if (andPlay) {
                    DG.Tweening.TweenExtensions.Play(DG.Tweening.Tween, this.tween);
                } else {
                    DG.Tweening.TweenExtensions.Pause(DG.Tweening.Tween, this.tween);
                }

                if (this.hasOnTweenCreated && this.onTweenCreated != null) {
                    this.onTweenCreated.Invoke();
                }
            },
            /*DG.Tweening.DOTweenAnimation.CreateTween end.*/

            /*DG.Tweening.DOTweenAnimation.GetTweens start.*/
            /**
             * Returns the tweens (if generated and not killed) created by all DOTweenAnimations on this gameObject,
             in the same order as they appear in the Inspector (top to bottom).<p />
             Note that a tween is generated inside the Awake call (except RectTransform tweens which are generated inside Start),
             so this method won't return them before that
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {System.Collections.Generic.List$1}
             */
            GetTweens: function () {
                var $t;
                var result = new (System.Collections.Generic.List$1(DG.Tweening.Tween)).ctor();
                var anims = this.GetComponents(DG.Tweening.DOTweenAnimation);
                $t = Bridge.getEnumerator(anims);
                try {
                    while ($t.moveNext()) {
                        var anim = $t.Current;
                        if (anim.tween != null && anim.tween.active) {
                            result.add(anim.tween);
                        }
                    }
                } finally {
                    if (Bridge.is($t, System.IDisposable)) {
                        $t.System$IDisposable$Dispose();
                    }
                }
                return result;
            },
            /*DG.Tweening.DOTweenAnimation.GetTweens end.*/

            /*DG.Tweening.DOTweenAnimation.SetAnimationTarget start.*/
            /**
             * Sets the animation target (which must be of the same type of the one set in the Inspector).
             This is useful if you want to change it BEFORE this {@link }
             creates a tween, while after that it won't have any effect.<p />
             Consider that a {@link } creates its tween inside its Awake (except for special tweens),
             so you will need to sure your code runs before this object's Awake (via ScriptExecutionOrder or enabling/disabling methods)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {UnityEngine.Component}    tweenTarget                                   New target for the animation (must be of the same type of the previous one)
             * @param   {boolean}                  useTweenTargetGameObjectForGroupOperations    If TRUE also uses tweenTarget's gameObject when settings the target-ID of the tween
             (which is used with DOPlay/DORestart/etc to apply the same operation on all tweens that have the same target-id).<p />
             You should usually leave this to TRUE if you change the target.
             * @return  {void}
             */
            SetAnimationTarget: function (tweenTarget, useTweenTargetGameObjectForGroupOperations) {
                if (useTweenTargetGameObjectForGroupOperations === void 0) { useTweenTargetGameObjectForGroupOperations = true; }
                var newTargetType = DG.Tweening.DOTweenAnimation.TypeToDOTargetType(Bridge.getType(this.target));
                if (newTargetType !== this.targetType) {
                    UnityEngine.Debug.LogError$2("DOTweenAnimation \u25ba SetAnimationTarget: the new target is of a different type from the one set in the Inspector");
                    return;
                }
                this.target = tweenTarget;
                this.targetGO = this.target.gameObject;
                this.tweenTargetIsTargetGO = useTweenTargetGameObjectForGroupOperations;
            },
            /*DG.Tweening.DOTweenAnimation.SetAnimationTarget end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlay start.*/
            /**
             * Plays all tweens whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DOPlay: function () {
                DG.Tweening.DOTween.Play(this.GetTweenTarget());
            },
            /*DG.Tweening.DOTweenAnimation.DOPlay end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlayBackwards start.*/
            /**
             * Plays backwards all tweens whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DOPlayBackwards: function () {
                DG.Tweening.DOTween.PlayBackwards(this.GetTweenTarget());
            },
            /*DG.Tweening.DOTweenAnimation.DOPlayBackwards end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlayForward start.*/
            /**
             * Plays foward all tweens whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DOPlayForward: function () {
                DG.Tweening.DOTween.PlayForward(this.GetTweenTarget());
            },
            /*DG.Tweening.DOTweenAnimation.DOPlayForward end.*/

            /*DG.Tweening.DOTweenAnimation.DOPause start.*/
            /**
             * Pauses all tweens whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DOPause: function () {
                DG.Tweening.DOTween.Pause(this.GetTweenTarget());
            },
            /*DG.Tweening.DOTweenAnimation.DOPause end.*/

            /*DG.Tweening.DOTweenAnimation.DOTogglePause start.*/
            /**
             * Pauses/unpauses (depending on the current state) all tweens whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DOTogglePause: function () {
                DG.Tweening.DOTween.TogglePause(this.GetTweenTarget());
            },
            /*DG.Tweening.DOTweenAnimation.DOTogglePause end.*/

            /*DG.Tweening.DOTweenAnimation.DORewind start.*/
            /**
             * Rewinds all tweens created by this animation in the correct order
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DORewind: function () {
                this._playCount = -1;
                // Rewind using Components order (in case there are multiple animations on the same property)
                var anims = this.gameObject.GetComponents(DG.Tweening.DOTweenAnimation);
                for (var i = (anims.length - 1) | 0; i > -1; i = (i - 1) | 0) {
                    var t = anims[i].tween;
                    if (t != null && DG.Tweening.TweenExtensions.IsInitialized(t)) {
                        DG.Tweening.TweenExtensions.Rewind(anims[i].tween);
                    }
                }
                // DOTween.Rewind(GetTweenTarget());
            },
            /*DG.Tweening.DOTweenAnimation.DORewind end.*/

            /*DG.Tweening.DOTweenAnimation.DORestart start.*/
            /**
             * Restarts all tweens whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DORestart: function () {
                this.DORestart$1(false);
            },
            /*DG.Tweening.DOTweenAnimation.DORestart end.*/

            /*DG.Tweening.DOTweenAnimation.DORestart$1 start.*/
            /**
             * Restarts all tweens whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {boolean}    fromHere    If TRUE, re-evaluates the tween's start and end values from its current position.
             Set it to TRUE when spawning the same DOTweenAnimation in different positions (like when using a pooling system)
             * @return  {void}
             */
            DORestart$1: function (fromHere) {
                this._playCount = -1;
                if (this.tween == null) {
                    if (DG.Tweening.Core.Debugger.logPriority > 1) {
                        DG.Tweening.Core.Debugger.LogNullTween(this.tween);
                    }
                    return;
                }
                if (fromHere && this.isRelative) {
                    this.ReEvaluateRelativeTween();
                }
                DG.Tweening.DOTween.Restart(this.GetTweenTarget());
            },
            /*DG.Tweening.DOTweenAnimation.DORestart$1 end.*/

            /*DG.Tweening.DOTweenAnimation.DOComplete start.*/
            /**
             * Completes all tweens whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DOComplete: function () {
                DG.Tweening.DOTween.Complete(this.GetTweenTarget());
            },
            /*DG.Tweening.DOTweenAnimation.DOComplete end.*/

            /*DG.Tweening.DOTweenAnimation.DOKill start.*/
            /**
             * Kills all tweens whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @override
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DOKill: function () {
                DG.Tweening.DOTween.Kill(this.GetTweenTarget());
                this.tween = null;
            },
            /*DG.Tweening.DOTweenAnimation.DOKill end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlayById start.*/
            /**
             * Plays all tweens with the given ID and whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DOPlayById: function (id) {
                DG.Tweening.DOTween.Play$1(this.GetTweenTarget(), id);
            },
            /*DG.Tweening.DOTweenAnimation.DOPlayById end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlayAllById start.*/
            /**
             * Plays all tweens with the given ID (regardless of their target gameObject)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DOPlayAllById: function (id) {
                DG.Tweening.DOTween.Play(id);
            },
            /*DG.Tweening.DOTweenAnimation.DOPlayAllById end.*/

            /*DG.Tweening.DOTweenAnimation.DOPauseAllById start.*/
            /**
             * Pauses all tweens that with the given ID (regardless of their target gameObject)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DOPauseAllById: function (id) {
                DG.Tweening.DOTween.Pause(id);
            },
            /*DG.Tweening.DOTweenAnimation.DOPauseAllById end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlayBackwardsById start.*/
            /**
             * Plays backwards all tweens with the given ID and whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DOPlayBackwardsById: function (id) {
                DG.Tweening.DOTween.PlayBackwards$1(this.GetTweenTarget(), id);
            },
            /*DG.Tweening.DOTweenAnimation.DOPlayBackwardsById end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlayBackwardsAllById start.*/
            /**
             * Plays backwards all tweens with the given ID (regardless of their target gameObject)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DOPlayBackwardsAllById: function (id) {
                DG.Tweening.DOTween.PlayBackwards(id);
            },
            /*DG.Tweening.DOTweenAnimation.DOPlayBackwardsAllById end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlayForwardById start.*/
            /**
             * Plays forward all tweens with the given ID and whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DOPlayForwardById: function (id) {
                DG.Tweening.DOTween.PlayForward$1(this.GetTweenTarget(), id);
            },
            /*DG.Tweening.DOTweenAnimation.DOPlayForwardById end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlayForwardAllById start.*/
            /**
             * Plays forward all tweens with the given ID (regardless of their target gameObject)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DOPlayForwardAllById: function (id) {
                DG.Tweening.DOTween.PlayForward(id);
            },
            /*DG.Tweening.DOTweenAnimation.DOPlayForwardAllById end.*/

            /*DG.Tweening.DOTweenAnimation.DOPlayNext start.*/
            /**
             * Plays the next animation on this animation's gameObject (if any)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DOPlayNext: function () {
                var anims = this.GetComponents(DG.Tweening.DOTweenAnimation);
                while (this._playCount < ((anims.length - 1) | 0)) {
                    this._playCount = (this._playCount + 1) | 0;
                    var anim = anims[this._playCount];
                    if (UnityEngine.MonoBehaviour.op_Inequality(anim, null) && anim.tween != null && anim.tween.active && !DG.Tweening.TweenExtensions.IsPlaying(anim.tween) && !DG.Tweening.TweenExtensions.IsComplete(anim.tween)) {
                        DG.Tweening.TweenExtensions.Play(DG.Tweening.Tween, anim.tween);
                        break;
                    }
                }
            },
            /*DG.Tweening.DOTweenAnimation.DOPlayNext end.*/

            /*DG.Tweening.DOTweenAnimation.DORewindAndPlayNext start.*/
            /**
             * Rewinds all tweens with the given ID and whose target-id is the same as the one set by this animation,
             then plays the next animation on this animation's gameObject (if any)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {void}
             */
            DORewindAndPlayNext: function () {
                this._playCount = -1;
                DG.Tweening.DOTween.Rewind(this.GetTweenTarget());
                this.DOPlayNext();
            },
            /*DG.Tweening.DOTweenAnimation.DORewindAndPlayNext end.*/

            /*DG.Tweening.DOTweenAnimation.DORewindAllById start.*/
            /**
             * Rewinds all tweens with the given ID (regardless of their target gameObject)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DORewindAllById: function (id) {
                this._playCount = -1;
                DG.Tweening.DOTween.Rewind(id);
            },
            /*DG.Tweening.DOTweenAnimation.DORewindAllById end.*/

            /*DG.Tweening.DOTweenAnimation.DORestartById start.*/
            /**
             * Restarts all tweens with the given ID and whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DORestartById: function (id) {
                this._playCount = -1;
                DG.Tweening.DOTween.Restart$1(this.GetTweenTarget(), id);
            },
            /*DG.Tweening.DOTweenAnimation.DORestartById end.*/

            /*DG.Tweening.DOTweenAnimation.DORestartAllById start.*/
            /**
             * Restarts all tweens with the given ID (regardless of their target gameObject)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DORestartAllById: function (id) {
                this._playCount = -1;
                DG.Tweening.DOTween.Restart(id);
            },
            /*DG.Tweening.DOTweenAnimation.DORestartAllById end.*/

            /*DG.Tweening.DOTweenAnimation.DOKillById start.*/
            /**
             * Kills all tweens with the given ID and whose target-id is the same as the one set by this animation
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DOKillById: function (id) {
                DG.Tweening.DOTween.Kill$1(this.GetTweenTarget(), id);
            },
            /*DG.Tweening.DOTweenAnimation.DOKillById end.*/

            /*DG.Tweening.DOTweenAnimation.DOKillAllById start.*/
            /**
             * Kills all tweens with the given ID (regardless of their target gameObject)
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @param   {string}    id
             * @return  {void}
             */
            DOKillAllById: function (id) {
                DG.Tweening.DOTween.Kill(id);
            },
            /*DG.Tweening.DOTweenAnimation.DOKillAllById end.*/

            /*DG.Tweening.DOTweenAnimation.CreateEditorPreview start.*/
            /**
             * Previews the tween in the editor. Only for DOTween internal usage: don't use otherwise.
             *
             * @instance
             * @public
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {DG.Tweening.Tween}
             */
            CreateEditorPreview: function () {
                if (UnityEngine.Application.isPlaying) {
                    return null;
                }

                // CHANGE: first param switched to TRUE otherwise changing an animation and replaying in editor would still play old one
                this.CreateTween(true, this.autoPlay);
                return this.tween;
            },
            /*DG.Tweening.DOTweenAnimation.CreateEditorPreview end.*/

            /*DG.Tweening.DOTweenAnimation.GetTweenGO start.*/
            /**
             * Returns the gameObject whose target component should be animated
             *
             * @instance
             * @private
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {UnityEngine.GameObject}
             */
            GetTweenGO: function () {
                return this.targetIsSelf ? this.gameObject : this.targetGO;
            },
            /*DG.Tweening.DOTweenAnimation.GetTweenGO end.*/

            /*DG.Tweening.DOTweenAnimation.GetTweenTarget start.*/
            /**
             * Returns the GameObject which should be used/retrieved for SetTarget
             *
             * @instance
             * @private
             * @this DG.Tweening.DOTweenAnimation
             * @memberof DG.Tweening.DOTweenAnimation
             * @return  {UnityEngine.GameObject}
             */
            GetTweenTarget: function () {
                return this.targetIsSelf || !this.tweenTargetIsTargetGO ? this.gameObject : this.targetGO;
            },
            /*DG.Tweening.DOTweenAnimation.GetTweenTarget end.*/

            /*DG.Tweening.DOTweenAnimation.ReEvaluateRelativeTween start.*/
            ReEvaluateRelativeTween: function () {
                var tweenGO = this.GetTweenGO();
                if (UnityEngine.GameObject.op_Equality(tweenGO, null)) {
                    UnityEngine.Debug.LogWarning$1(System.String.format("{0} :: This DOTweenAnimation's target/GameObject is unset: the tween will not be created.", [this.gameObject.name]), this.gameObject);
                    return;
                }
                if (this.animationType === DG.Tweening.DOTweenAnimation.AnimationType.Move) {
                    Bridge.cast(this.tween, DG.Tweening.Tweener).ChangeEndValue(tweenGO.transform.position.$clone().add( this.endValueV3 ).$clone(), true);
                } else if (this.animationType === DG.Tweening.DOTweenAnimation.AnimationType.LocalMove) {
                    Bridge.cast(this.tween, DG.Tweening.Tweener).ChangeEndValue(tweenGO.transform.localPosition.$clone().add( this.endValueV3 ).$clone(), true);
                }
            },
            /*DG.Tweening.DOTweenAnimation.ReEvaluateRelativeTween end.*/


        },
        overloads: {
            "DORestart(bool)": "DORestart$1"
        }
    });
    /*DG.Tweening.DOTweenAnimation end.*/

    /*DG.Tweening.DOTweenAnimation+AnimationType start.*/
    Bridge.define("DG.Tweening.DOTweenAnimation.AnimationType", {
        $kind: 1006,
        statics: {
            fields: {
                None: 0,
                Move: 1,
                LocalMove: 2,
                Rotate: 3,
                LocalRotate: 4,
                Scale: 5,
                Color: 6,
                Fade: 7,
                Text: 8,
                PunchPosition: 9,
                PunchRotation: 10,
                PunchScale: 11,
                ShakePosition: 12,
                ShakeRotation: 13,
                ShakeScale: 14,
                CameraAspect: 15,
                CameraBackgroundColor: 16,
                CameraFieldOfView: 17,
                CameraOrthoSize: 18,
                CameraPixelRect: 19,
                CameraRect: 20,
                UIWidthHeight: 21
            }
        }
    });
    /*DG.Tweening.DOTweenAnimation+AnimationType end.*/

    /*DG.Tweening.DOTweenAnimation+TargetType start.*/
    Bridge.define("DG.Tweening.DOTweenAnimation.TargetType", {
        $kind: 1006,
        statics: {
            fields: {
                Unset: 0,
                Camera: 1,
                CanvasGroup: 2,
                Image: 3,
                Light: 4,
                RectTransform: 5,
                Renderer: 6,
                SpriteRenderer: 7,
                Rigidbody: 8,
                Rigidbody2D: 9,
                Text: 10,
                Transform: 11,
                tk2dBaseSprite: 12,
                tk2dTextMesh: 13,
                TextMeshPro: 14,
                TextMeshProUGUI: 15
            }
        }
    });
    /*DG.Tweening.DOTweenAnimation+TargetType end.*/

    /*DG.Tweening.DOTweenAnimationExtensions start.*/
    Bridge.define("DG.Tweening.DOTweenAnimationExtensions", {
        statics: {
            methods: {
                /*DG.Tweening.DOTweenAnimationExtensions.IsSameOrSubclassOf:static start.*/
                IsSameOrSubclassOf: function (T, t) {
                    return Bridge.is(t, T);
                },
                /*DG.Tweening.DOTweenAnimationExtensions.IsSameOrSubclassOf:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenAnimationExtensions end.*/

    /*DG.Tweening.DOTweenCYInstruction start.*/
    Bridge.define("DG.Tweening.DOTweenCYInstruction");
    /*DG.Tweening.DOTweenCYInstruction end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForCompletion start.*/
    Bridge.define("DG.Tweening.DOTweenCYInstruction.WaitForCompletion", {
        inherits: [UnityEngine.CustomYieldInstruction],
        $kind: 1002,
        fields: {
            t: null
        },
        props: {
            keepWaiting: {
                get: function () {
                    return this.t.active && !DG.Tweening.TweenExtensions.IsComplete(this.t);
                }
            }
        },
        ctors: {
            ctor: function (tween) {
                this.$initialize();
                UnityEngine.CustomYieldInstruction.ctor.call(this);
                this.t = tween;
            }
        }
    });
    /*DG.Tweening.DOTweenCYInstruction+WaitForCompletion end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForElapsedLoops start.*/
    Bridge.define("DG.Tweening.DOTweenCYInstruction.WaitForElapsedLoops", {
        inherits: [UnityEngine.CustomYieldInstruction],
        $kind: 1002,
        fields: {
            t: null,
            elapsedLoops: 0
        },
        props: {
            keepWaiting: {
                get: function () {
                    return this.t.active && DG.Tweening.TweenExtensions.CompletedLoops(this.t) < this.elapsedLoops;
                }
            }
        },
        ctors: {
            ctor: function (tween, elapsedLoops) {
                this.$initialize();
                UnityEngine.CustomYieldInstruction.ctor.call(this);
                this.t = tween;
                this.elapsedLoops = elapsedLoops;
            }
        }
    });
    /*DG.Tweening.DOTweenCYInstruction+WaitForElapsedLoops end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForKill start.*/
    Bridge.define("DG.Tweening.DOTweenCYInstruction.WaitForKill", {
        inherits: [UnityEngine.CustomYieldInstruction],
        $kind: 1002,
        fields: {
            t: null
        },
        props: {
            keepWaiting: {
                get: function () {
                    return this.t.active;
                }
            }
        },
        ctors: {
            ctor: function (tween) {
                this.$initialize();
                UnityEngine.CustomYieldInstruction.ctor.call(this);
                this.t = tween;
            }
        }
    });
    /*DG.Tweening.DOTweenCYInstruction+WaitForKill end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForPosition start.*/
    Bridge.define("DG.Tweening.DOTweenCYInstruction.WaitForPosition", {
        inherits: [UnityEngine.CustomYieldInstruction],
        $kind: 1002,
        fields: {
            t: null,
            position: 0
        },
        props: {
            keepWaiting: {
                get: function () {
                    return this.t.active && this.t.position * (((DG.Tweening.TweenExtensions.CompletedLoops(this.t) + 1) | 0)) < this.position;
                }
            }
        },
        ctors: {
            ctor: function (tween, position) {
                this.$initialize();
                UnityEngine.CustomYieldInstruction.ctor.call(this);
                this.t = tween;
                this.position = position;
            }
        }
    });
    /*DG.Tweening.DOTweenCYInstruction+WaitForPosition end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForRewind start.*/
    Bridge.define("DG.Tweening.DOTweenCYInstruction.WaitForRewind", {
        inherits: [UnityEngine.CustomYieldInstruction],
        $kind: 1002,
        fields: {
            t: null
        },
        props: {
            keepWaiting: {
                get: function () {
                    return this.t.active && (!this.t.playedOnce || this.t.position * (((DG.Tweening.TweenExtensions.CompletedLoops(this.t) + 1) | 0)) > 0);
                }
            }
        },
        ctors: {
            ctor: function (tween) {
                this.$initialize();
                UnityEngine.CustomYieldInstruction.ctor.call(this);
                this.t = tween;
            }
        }
    });
    /*DG.Tweening.DOTweenCYInstruction+WaitForRewind end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForStart start.*/
    Bridge.define("DG.Tweening.DOTweenCYInstruction.WaitForStart", {
        inherits: [UnityEngine.CustomYieldInstruction],
        $kind: 1002,
        fields: {
            t: null
        },
        props: {
            keepWaiting: {
                get: function () {
                    return this.t.active && !this.t.playedOnce;
                }
            }
        },
        ctors: {
            ctor: function (tween) {
                this.$initialize();
                UnityEngine.CustomYieldInstruction.ctor.call(this);
                this.t = tween;
            }
        }
    });
    /*DG.Tweening.DOTweenCYInstruction+WaitForStart end.*/

    /*DG.Tweening.DOTweenModuleAudio start.*/
    Bridge.define("DG.Tweening.DOTweenModuleAudio", {
        statics: {
            methods: {
                /*DG.Tweening.DOTweenModuleAudio.DOFade:static start.*/
                /**
                 * Tweens an AudioSource's volume to the given value.
                 Also stores the AudioSource as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.AudioSource}           target      
                 * @param   {number}                            endValue    The end value to reach (0 to 1)
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOFade: function (target, endValue, duration) {
                    if (endValue < 0) {
                        endValue = 0;
                    } else {
                        if (endValue > 1) {
                            endValue = 1;
                        }
                    }
                    var t = DG.Tweening.DOTween.To$4(function () {
                        return target.volume;
                    }, function (x) {
                        target.volume = x;
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleAudio.DOFade:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOPitch:static start.*/
                /**
                 * Tweens an AudioSource's pitch to the given value.
                 Also stores the AudioSource as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.AudioSource}           target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOPitch: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$4(function () {
                        return target.pitch;
                    }, function (x) {
                        target.pitch = x;
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleAudio.DOPitch:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOSetFloat:static start.*/
                /**
                 * Tweens an AudioMixer's exposed float to the given value.
                 Also stores the AudioMixer as the tween's target so it can be used for filtered operations.
                 Note that you need to manually expose a float in an AudioMixerGroup in order to be able to tween it from an AudioMixer.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}      target       
                 * @param   {string}                            floatName    Name given to the exposed float to set
                 * @param   {number}                            endValue     The end value to reach
                 * @param   {number}                            duration     The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOSetFloat: function (target, floatName, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$4(function () {
                        var currVal = { };
                        target.GetFloat(floatName, currVal);
                        return currVal.v;
                    }, function (x) {
                        target.SetFloat(floatName, x);
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleAudio.DOSetFloat:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOComplete:static start.*/
                /**
                 * Completes all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens completed
                 (meaning the tweens that don't have infinite loops and were not already complete)
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target           
                 * @param   {boolean}                         withCallbacks    For Sequences only: if TRUE also internal Sequence callbacks will be fired,
                 otherwise they will be ignored
                 * @return  {number}
                 */
                DOComplete: function (target, withCallbacks) {
                    if (withCallbacks === void 0) { withCallbacks = false; }
                    return DG.Tweening.DOTween.Complete(target, withCallbacks);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOComplete:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOKill:static start.*/
                /**
                 * Kills all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens killed.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target      
                 * @param   {boolean}                         complete    If TRUE completes the tween before killing it
                 * @return  {number}
                 */
                DOKill: function (target, complete) {
                    if (complete === void 0) { complete = false; }
                    return DG.Tweening.DOTween.Kill(target, complete);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOKill:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOFlip:static start.*/
                /**
                 * Flips the direction (backwards if it was going forward or viceversa) of all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens flipped.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target
                 * @return  {number}
                 */
                DOFlip: function (target) {
                    return DG.Tweening.DOTween.Flip(target);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOFlip:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOGoto:static start.*/
                /**
                 * Sends to the given position all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens involved.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target     
                 * @param   {number}                          to         Time position to reach
                 (if higher than the whole tween duration the tween will simply reach its end)
                 * @param   {boolean}                         andPlay    If TRUE will play the tween after reaching the given position, otherwise it will pause it
                 * @return  {number}
                 */
                DOGoto: function (target, to, andPlay) {
                    if (andPlay === void 0) { andPlay = false; }
                    return DG.Tweening.DOTween.Goto(target, to, andPlay);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOGoto:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOPause:static start.*/
                /**
                 * Pauses all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens paused.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target
                 * @return  {number}
                 */
                DOPause: function (target) {
                    return DG.Tweening.DOTween.Pause(target);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOPause:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOPlay:static start.*/
                /**
                 * Plays all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens played.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target
                 * @return  {number}
                 */
                DOPlay: function (target) {
                    return DG.Tweening.DOTween.Play(target);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOPlay:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOPlayBackwards:static start.*/
                /**
                 * Plays backwards all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens played.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target
                 * @return  {number}
                 */
                DOPlayBackwards: function (target) {
                    return DG.Tweening.DOTween.PlayBackwards(target);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOPlayBackwards:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOPlayForward:static start.*/
                /**
                 * Plays forward all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens played.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target
                 * @return  {number}
                 */
                DOPlayForward: function (target) {
                    return DG.Tweening.DOTween.PlayForward(target);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOPlayForward:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DORestart:static start.*/
                /**
                 * Restarts all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens restarted.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target
                 * @return  {number}
                 */
                DORestart: function (target) {
                    return DG.Tweening.DOTween.Restart(target);
                },
                /*DG.Tweening.DOTweenModuleAudio.DORestart:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DORewind:static start.*/
                /**
                 * Rewinds all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens rewinded.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target
                 * @return  {number}
                 */
                DORewind: function (target) {
                    return DG.Tweening.DOTween.Rewind(target);
                },
                /*DG.Tweening.DOTweenModuleAudio.DORewind:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOSmoothRewind:static start.*/
                /**
                 * Smoothly rewinds all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens rewinded.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target
                 * @return  {number}
                 */
                DOSmoothRewind: function (target) {
                    return DG.Tweening.DOTween.SmoothRewind(target);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOSmoothRewind:static end.*/

                /*DG.Tweening.DOTweenModuleAudio.DOTogglePause:static start.*/
                /**
                 * Toggles the paused state (plays if it was paused, pauses if it was playing) of all tweens that have this target as a reference
                 (meaning tweens that were started from this target, or that had this target added as an Id)
                 and returns the total number of tweens involved.
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleAudio
                 * @memberof DG.Tweening.DOTweenModuleAudio
                 * @param   {UnityEngine.Audio.AudioMixer}    target
                 * @return  {number}
                 */
                DOTogglePause: function (target) {
                    return DG.Tweening.DOTween.TogglePause(target);
                },
                /*DG.Tweening.DOTweenModuleAudio.DOTogglePause:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenModuleAudio end.*/

    /*DG.Tweening.DOTweenModulePhysics start.*/
    Bridge.define("DG.Tweening.DOTweenModulePhysics", {
        statics: {
            methods: {
                /*DG.Tweening.DOTweenModulePhysics.DOMove:static start.*/
                /**
                 * Tweens a Rigidbody's position to the given value.
                 Also stores the rigidbody as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics
                 * @memberof DG.Tweening.DOTweenModulePhysics
                 * @param   {UnityEngine.Rigidbody}             target      
                 * @param   {UnityEngine.Vector3}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOMove: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$12(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$13(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOMove:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DOMoveX:static start.*/
                /**
                 * Tweens a Rigidbody's X position to the given value.
                 Also stores the rigidbody as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics
                 * @memberof DG.Tweening.DOTweenModulePhysics
                 * @param   {UnityEngine.Rigidbody}             target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOMoveX: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$12(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), new pc.Vec3( endValue, 0, 0 ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$12(t, DG.Tweening.AxisConstraint.X, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOMoveX:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DOMoveY:static start.*/
                /**
                 * Tweens a Rigidbody's Y position to the given value.
                 Also stores the rigidbody as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics
                 * @memberof DG.Tweening.DOTweenModulePhysics
                 * @param   {UnityEngine.Rigidbody}             target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOMoveY: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$12(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), new pc.Vec3( 0, endValue, 0 ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$12(t, DG.Tweening.AxisConstraint.Y, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOMoveY:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DOMoveZ:static start.*/
                /**
                 * Tweens a Rigidbody's Z position to the given value.
                 Also stores the rigidbody as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics
                 * @memberof DG.Tweening.DOTweenModulePhysics
                 * @param   {UnityEngine.Rigidbody}             target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOMoveZ: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$12(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), new pc.Vec3( 0, 0, endValue ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$12(t, DG.Tweening.AxisConstraint.Z, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOMoveZ:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DORotate:static start.*/
                /**
                 * Tweens a Rigidbody's rotation to the given value.
                 Also stores the rigidbody as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics
                 * @memberof DG.Tweening.DOTweenModulePhysics
                 * @param   {UnityEngine.Rigidbody}             target      
                 * @param   {UnityEngine.Vector3}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {DG.Tweening.RotateMode}            mode        Rotation mode
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DORotate: function (target, endValue, duration, mode) {
                    if (mode === void 0) { mode = 0; }
                    var t = DG.Tweening.DOTween.To$9(function () {
                        return target.rotation;
                    }, Bridge.fn.cacheBind(target, target.MoveRotation), endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Quaternion,UnityEngine.Vector3,DG.Tweening.Plugins.Options.QuaternionOptions), t, target);
                    t.plugOptions.rotateMode = mode;
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DORotate:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DOLookAt:static start.*/
                /**
                 * Tweens a Rigidbody's rotation so that it will look towards the given position.
                 Also stores the rigidbody as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics
                 * @memberof DG.Tweening.DOTweenModulePhysics
                 * @param   {UnityEngine.Rigidbody}             target            
                 * @param   {UnityEngine.Vector3}               towards           The position to look at
                 * @param   {number}                            duration          The duration of the tween
                 * @param   {DG.Tweening.AxisConstraint}        axisConstraint    Eventual axis constraint for the rotation
                 * @param   {?UnityEngine.Vector3}              up                The vector that defines in which direction up is (default: Vector3.up)
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOLookAt: function (target, towards, duration, axisConstraint, up) {
                    if (axisConstraint === void 0) { axisConstraint = 0; }
                    if (up === void 0) { up = null; }
                    var t = DG.Tweening.Core.Extensions.SetSpecialStartupMode(DG.Tweening.Core.TweenerCore$3(UnityEngine.Quaternion,UnityEngine.Vector3,DG.Tweening.Plugins.Options.QuaternionOptions), DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Quaternion,UnityEngine.Vector3,DG.Tweening.Plugins.Options.QuaternionOptions), DG.Tweening.DOTween.To$9(function () {
                        return target.rotation;
                    }, Bridge.fn.cacheBind(target, target.MoveRotation), towards.$clone(), duration), target), DG.Tweening.Core.Enums.SpecialStartupMode.SetLookAt);
                    t.plugOptions.axisConstraint = axisConstraint;
                    t.plugOptions.up = (pc.Vec3.equals( up, null )) ? pc.Vec3.UP.clone() : System.Nullable.getValue(up);
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOLookAt:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DOJump:static start.*/
                /**
                 * Tweens a Rigidbody's position to the given value, while also applying a jump effect along the Y axis.
                 Returns a Sequence instead of a Tweener.
                 Also stores the Rigidbody as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics
                 * @memberof DG.Tweening.DOTweenModulePhysics
                 * @param   {UnityEngine.Rigidbody}    target       
                 * @param   {UnityEngine.Vector3}      endValue     The end value to reach
                 * @param   {number}                   jumpPower    Power of the jump (the max height of the jump is represented by this plus the final Y offset)
                 * @param   {number}                   numJumps     Total number of jumps
                 * @param   {number}                   duration     The duration of the tween
                 * @param   {boolean}                  snapping     If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Sequence}
                 */
                DOJump: function (target, endValue, jumpPower, numJumps, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    if (numJumps < 1) {
                        numJumps = 1;
                    }
                    var startPosY = 0;
                    var offsetY = -1;
                    var offsetYSet = false;
                    var s = DG.Tweening.DOTween.Sequence();
                    var yTween = DG.Tweening.TweenSettingsExtensions.OnStart(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetLoops$1(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetRelative(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$12(DG.Tweening.DOTween.To$12(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), new pc.Vec3( 0, jumpPower, 0 ), duration / (Bridge.Int.mul(numJumps, 2))), DG.Tweening.AxisConstraint.Y, snapping), DG.Tweening.Ease.OutQuad)), Bridge.Int.mul(numJumps, 2), DG.Tweening.LoopType.Yoyo), function () {
                        startPosY = target.position.y;
                    });
                    DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Sequence, DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Sequence, DG.Tweening.TweenSettingsExtensions.Join(DG.Tweening.TweenSettingsExtensions.Join(DG.Tweening.TweenSettingsExtensions.Append(s, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$12(DG.Tweening.DOTween.To$12(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), new pc.Vec3( endValue.x, 0, 0 ), duration), DG.Tweening.AxisConstraint.X, snapping), DG.Tweening.Ease.Linear)), DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$12(DG.Tweening.DOTween.To$12(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), new pc.Vec3( 0, 0, endValue.z ), duration), DG.Tweening.AxisConstraint.Z, snapping), DG.Tweening.Ease.Linear)), yTween), target), DG.Tweening.DOTween.defaultEaseType);
                    DG.Tweening.TweenSettingsExtensions.OnUpdate(DG.Tweening.Tween, yTween, function () {
                        if (!offsetYSet) {
                            offsetYSet = true;
                            offsetY = s.isRelative ? endValue.y : endValue.y - startPosY;
                        }
                        var pos = target.position.$clone();
                        pos.y += DG.Tweening.DOVirtual.EasedValue(0, offsetY, DG.Tweening.TweenExtensions.ElapsedPercentage(yTween), DG.Tweening.Ease.OutQuad);
                        target.MovePosition(pos);
                    });
                    return s;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOJump:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DOPath:static start.*/
                /**
                 * Tweens a Rigidbody's position through the given path waypoints, using the chosen path algorithm.
                 Also stores the Rigidbody as the tween's target so it can be used for filtered operations.
                 <p>NOTE: to tween a rigidbody correctly it should be set to kinematic at least while being tweened.</p><p>BEWARE: doesn't work on Windows Phone store (waiting for Unity to fix their own bug).
                 If you plan to publish there you should use a regular transform.DOPath.</p>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics
                 * @memberof DG.Tweening.DOTweenModulePhysics
                 * @param   {UnityEngine.Rigidbody}             target        
                 * @param   {Array.<UnityEngine.Vector3>}       path          The waypoints to go through
                 * @param   {number}                            duration      The duration of the tween
                 * @param   {DG.Tweening.PathType}              pathType      The type of path: Linear (straight path), CatmullRom (curved CatmullRom path) or CubicBezier (curved with control points)
                 * @param   {DG.Tweening.PathMode}              pathMode      The path mode: 3D, side-scroller 2D, top-down 2D
                 * @param   {number}                            resolution    The resolution of the path (useless in case of Linear paths): higher resolutions make for more detailed curved paths but are more expensive.
                 Defaults to 10, but a value of 5 is usually enough if you don't have dramatic long curves between waypoints
                 * @param   {?UnityEngine.Color}                gizmoColor    The color of the path (shown when gizmos are active in the Play panel and the tween is running)
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOPath: function (target, path, duration, pathType, pathMode, resolution, gizmoColor) {
                    if (pathType === void 0) { pathType = 0; }
                    if (pathMode === void 0) { pathMode = 1; }
                    if (resolution === void 0) { resolution = 10; }
                    if (gizmoColor === void 0) { gizmoColor = null; }
                    if (resolution < 1) {
                        resolution = 1;
                    }
                    var t = DG.Tweening.TweenSettingsExtensions.SetUpdate$1(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, DG.Tweening.Plugins.Core.PathCore.Path, DG.Tweening.Plugins.Options.PathOptions, DG.Tweening.Plugins.PathPlugin.Get(), function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), new DG.Tweening.Plugins.Core.PathCore.Path.$ctor1(pathType, path, resolution, System.Nullable.lift1("$clone", gizmoColor)), duration), target), DG.Tweening.UpdateType.Fixed);

                    t.plugOptions.isRigidbody = true;
                    t.plugOptions.mode = pathMode;
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOPath:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DOPath$1:static start.*/
                DOPath$1: function (target, path, duration, pathMode) {
                    if (pathMode === void 0) { pathMode = 1; }
                    var t = DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, DG.Tweening.Plugins.Core.PathCore.Path, DG.Tweening.Plugins.Options.PathOptions, DG.Tweening.Plugins.PathPlugin.Get(), function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), path, duration), target);

                    t.plugOptions.isRigidbody = true;
                    t.plugOptions.mode = pathMode;
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOPath$1:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DOLocalPath:static start.*/
                /**
                 * Tweens a Rigidbody's localPosition through the given path waypoints, using the chosen path algorithm.
                 Also stores the Rigidbody as the tween's target so it can be used for filtered operations
                 <p>NOTE: to tween a rigidbody correctly it should be set to kinematic at least while being tweened.</p><p>BEWARE: doesn't work on Windows Phone store (waiting for Unity to fix their own bug).
                 If you plan to publish there you should use a regular transform.DOLocalPath.</p>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics
                 * @memberof DG.Tweening.DOTweenModulePhysics
                 * @param   {UnityEngine.Rigidbody}             target        
                 * @param   {Array.<UnityEngine.Vector3>}       path          The waypoint to go through
                 * @param   {number}                            duration      The duration of the tween
                 * @param   {DG.Tweening.PathType}              pathType      The type of path: Linear (straight path), CatmullRom (curved CatmullRom path) or CubicBezier (curved with control points)
                 * @param   {DG.Tweening.PathMode}              pathMode      The path mode: 3D, side-scroller 2D, top-down 2D
                 * @param   {number}                            resolution    The resolution of the path: higher resolutions make for more detailed curved paths but are more expensive.
                 Defaults to 10, but a value of 5 is usually enough if you don't have dramatic long curves between waypoints
                 * @param   {?UnityEngine.Color}                gizmoColor    The color of the path (shown when gizmos are active in the Play panel and the tween is running)
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOLocalPath: function (target, path, duration, pathType, pathMode, resolution, gizmoColor) {
                    if (pathType === void 0) { pathType = 0; }
                    if (pathMode === void 0) { pathMode = 1; }
                    if (resolution === void 0) { resolution = 10; }
                    if (gizmoColor === void 0) { gizmoColor = null; }
                    if (resolution < 1) {
                        resolution = 1;
                    }
                    var trans = target.transform;
                    var t = DG.Tweening.TweenSettingsExtensions.SetUpdate$1(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, DG.Tweening.Plugins.Core.PathCore.Path, DG.Tweening.Plugins.Options.PathOptions, DG.Tweening.Plugins.PathPlugin.Get(), function () {
                        return trans.localPosition;
                    }, function (x) {
                        target.MovePosition(UnityEngine.Component.op_Equality(trans.parent, null) ? x.$clone() : trans.parent.TransformPoint$1(x));
                    }, new DG.Tweening.Plugins.Core.PathCore.Path.$ctor1(pathType, path, resolution, System.Nullable.lift1("$clone", gizmoColor)), duration), target), DG.Tweening.UpdateType.Fixed);

                    t.plugOptions.isRigidbody = true;
                    t.plugOptions.mode = pathMode;
                    t.plugOptions.useLocalPosition = true;
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOLocalPath:static end.*/

                /*DG.Tweening.DOTweenModulePhysics.DOLocalPath$1:static start.*/
                DOLocalPath$1: function (target, path, duration, pathMode) {
                    if (pathMode === void 0) { pathMode = 1; }
                    var trans = target.transform;
                    var t = DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, DG.Tweening.Plugins.Core.PathCore.Path, DG.Tweening.Plugins.Options.PathOptions, DG.Tweening.Plugins.PathPlugin.Get(), function () {
                        return trans.localPosition;
                    }, function (x) {
                        target.MovePosition(UnityEngine.Component.op_Equality(trans.parent, null) ? x.$clone() : trans.parent.TransformPoint$1(x));
                    }, path, duration), target);

                    t.plugOptions.isRigidbody = true;
                    t.plugOptions.mode = pathMode;
                    t.plugOptions.useLocalPosition = true;
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics.DOLocalPath$1:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenModulePhysics end.*/

    /*DG.Tweening.DOTweenModulePhysics2D start.*/
    Bridge.define("DG.Tweening.DOTweenModulePhysics2D", {
        statics: {
            methods: {
                /*DG.Tweening.DOTweenModulePhysics2D.DOMove:static start.*/
                /**
                 * Tweens a Rigidbody2D's position to the given value.
                 Also stores the Rigidbody2D as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics2D
                 * @memberof DG.Tweening.DOTweenModulePhysics2D
                 * @param   {UnityEngine.Rigidbody2D}           target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOMove: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$9(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics2D.DOMove:static end.*/

                /*DG.Tweening.DOTweenModulePhysics2D.DOMoveX:static start.*/
                /**
                 * Tweens a Rigidbody2D's X position to the given value.
                 Also stores the Rigidbody2D as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics2D
                 * @memberof DG.Tweening.DOTweenModulePhysics2D
                 * @param   {UnityEngine.Rigidbody2D}           target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOMoveX: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), new pc.Vec2( endValue, 0 ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(t, DG.Tweening.AxisConstraint.X, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics2D.DOMoveX:static end.*/

                /*DG.Tweening.DOTweenModulePhysics2D.DOMoveY:static start.*/
                /**
                 * Tweens a Rigidbody2D's Y position to the given value.
                 Also stores the Rigidbody2D as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics2D
                 * @memberof DG.Tweening.DOTweenModulePhysics2D
                 * @param   {UnityEngine.Rigidbody2D}           target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOMoveY: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), new pc.Vec2( 0, endValue ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(t, DG.Tweening.AxisConstraint.Y, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics2D.DOMoveY:static end.*/

                /*DG.Tweening.DOTweenModulePhysics2D.DORotate:static start.*/
                /**
                 * Tweens a Rigidbody2D's rotation to the given value.
                 Also stores the Rigidbody2D as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics2D
                 * @memberof DG.Tweening.DOTweenModulePhysics2D
                 * @param   {UnityEngine.Rigidbody2D}           target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DORotate: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$4(function () {
                        return target.rotation;
                    }, Bridge.fn.cacheBind(target, target.MoveRotation), endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics2D.DORotate:static end.*/

                /*DG.Tweening.DOTweenModulePhysics2D.DOJump:static start.*/
                /**
                 * Tweens a Rigidbody2D's position to the given value, while also applying a jump effect along the Y axis.
                 Returns a Sequence instead of a Tweener.
                 Also stores the Rigidbody2D as the tween's target so it can be used for filtered operations.
                 <p>IMPORTANT: a rigidbody2D can't be animated in a jump arc using MovePosition, so the tween will directly set the position</p>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics2D
                 * @memberof DG.Tweening.DOTweenModulePhysics2D
                 * @param   {UnityEngine.Rigidbody2D}    target       
                 * @param   {UnityEngine.Vector2}        endValue     The end value to reach
                 * @param   {number}                     jumpPower    Power of the jump (the max height of the jump is represented by this plus the final Y offset)
                 * @param   {number}                     numJumps     Total number of jumps
                 * @param   {number}                     duration     The duration of the tween
                 * @param   {boolean}                    snapping     If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Sequence}
                 */
                DOJump: function (target, endValue, jumpPower, numJumps, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    if (numJumps < 1) {
                        numJumps = 1;
                    }
                    var startPosY = 0;
                    var offsetY = -1;
                    var offsetYSet = false;
                    var s = DG.Tweening.DOTween.Sequence();
                    var yTween = DG.Tweening.TweenSettingsExtensions.OnStart(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetLoops$1(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetRelative(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(DG.Tweening.DOTween.To$11(function () {
                        return target.position;
                    }, function (x) {
                        target.position = x.$clone();
                    }, new pc.Vec2( 0, jumpPower ), duration / (Bridge.Int.mul(numJumps, 2))), DG.Tweening.AxisConstraint.Y, snapping), DG.Tweening.Ease.OutQuad)), Bridge.Int.mul(numJumps, 2), DG.Tweening.LoopType.Yoyo), function () {
                        startPosY = target.position.y;
                    });
                    DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Sequence, DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Sequence, DG.Tweening.TweenSettingsExtensions.Join(DG.Tweening.TweenSettingsExtensions.Append(s, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(DG.Tweening.DOTween.To$11(function () {
                        return target.position;
                    }, function (x) {
                        target.position = x.$clone();
                    }, new pc.Vec2( endValue.x, 0 ), duration), DG.Tweening.AxisConstraint.X, snapping), DG.Tweening.Ease.Linear)), yTween), target), DG.Tweening.DOTween.defaultEaseType);
                    DG.Tweening.TweenSettingsExtensions.OnUpdate(DG.Tweening.Tween, yTween, function () {
                        if (!offsetYSet) {
                            offsetYSet = true;
                            offsetY = s.isRelative ? endValue.y : endValue.y - startPosY;
                        }
                        var pos = UnityEngine.Vector3.FromVector2(target.position.$clone());
                        pos.y += DG.Tweening.DOVirtual.EasedValue(0, offsetY, DG.Tweening.TweenExtensions.ElapsedPercentage(yTween), DG.Tweening.Ease.OutQuad);
                        target.MovePosition$1(pos);
                    });
                    return s;
                },
                /*DG.Tweening.DOTweenModulePhysics2D.DOJump:static end.*/

                /*DG.Tweening.DOTweenModulePhysics2D.DOPath:static start.*/
                /**
                 * Tweens a Rigidbody2D's position through the given path waypoints, using the chosen path algorithm.
                 Also stores the Rigidbody2D as the tween's target so it can be used for filtered operations.
                 <p>NOTE: to tween a Rigidbody2D correctly it should be set to kinematic at least while being tweened.</p><p>BEWARE: doesn't work on Windows Phone store (waiting for Unity to fix their own bug).
                 If you plan to publish there you should use a regular transform.DOPath.</p>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics2D
                 * @memberof DG.Tweening.DOTweenModulePhysics2D
                 * @param   {UnityEngine.Rigidbody2D}           target        
                 * @param   {Array.<UnityEngine.Vector2>}       path          The waypoints to go through
                 * @param   {number}                            duration      The duration of the tween
                 * @param   {DG.Tweening.PathType}              pathType      The type of path: Linear (straight path), CatmullRom (curved CatmullRom path) or CubicBezier (curved with control points)
                 * @param   {DG.Tweening.PathMode}              pathMode      The path mode: 3D, side-scroller 2D, top-down 2D
                 * @param   {number}                            resolution    The resolution of the path (useless in case of Linear paths): higher resolutions make for more detailed curved paths but are more expensive.
                 Defaults to 10, but a value of 5 is usually enough if you don't have dramatic long curves between waypoints
                 * @param   {?UnityEngine.Color}                gizmoColor    The color of the path (shown when gizmos are active in the Play panel and the tween is running)
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOPath: function (target, path, duration, pathType, pathMode, resolution, gizmoColor) {
                    if (pathType === void 0) { pathType = 0; }
                    if (pathMode === void 0) { pathMode = 1; }
                    if (resolution === void 0) { resolution = 10; }
                    if (gizmoColor === void 0) { gizmoColor = null; }
                    if (resolution < 1) {
                        resolution = 1;
                    }
                    var len = path.length;
                    var path3D = System.Array.init(len, function (){
                        return new UnityEngine.Vector3();
                    }, UnityEngine.Vector3);
                    for (var i = 0; i < len; i = (i + 1) | 0) {
                        path3D[i] = UnityEngine.Vector3.FromVector2(path[i].$clone());
                    }
                    var t = DG.Tweening.TweenSettingsExtensions.SetUpdate$1(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, DG.Tweening.Plugins.Core.PathCore.Path, DG.Tweening.Plugins.Options.PathOptions, DG.Tweening.Plugins.PathPlugin.Get(), function () {
                        return UnityEngine.Vector3.FromVector2(target.position);
                    }, function (x) {
                        target.MovePosition$1(x);
                    }, new DG.Tweening.Plugins.Core.PathCore.Path.$ctor1(pathType, path3D, resolution, System.Nullable.lift1("$clone", gizmoColor)), duration), target), DG.Tweening.UpdateType.Fixed);

                    t.plugOptions.isRigidbody2D = true;
                    t.plugOptions.mode = pathMode;
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics2D.DOPath:static end.*/

                /*DG.Tweening.DOTweenModulePhysics2D.DOPath$1:static start.*/
                DOPath$1: function (target, path, duration, pathMode) {
                    if (pathMode === void 0) { pathMode = 1; }
                    var t = DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, DG.Tweening.Plugins.Core.PathCore.Path, DG.Tweening.Plugins.Options.PathOptions, DG.Tweening.Plugins.PathPlugin.Get(), function () {
                        return UnityEngine.Vector3.FromVector2(target.position);
                    }, function (x) {
                        target.MovePosition$1(x);
                    }, path, duration), target);

                    t.plugOptions.isRigidbody2D = true;
                    t.plugOptions.mode = pathMode;
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics2D.DOPath$1:static end.*/

                /*DG.Tweening.DOTweenModulePhysics2D.DOLocalPath:static start.*/
                /**
                 * Tweens a Rigidbody2D's localPosition through the given path waypoints, using the chosen path algorithm.
                 Also stores the Rigidbody2D as the tween's target so it can be used for filtered operations
                 <p>NOTE: to tween a Rigidbody2D correctly it should be set to kinematic at least while being tweened.</p><p>BEWARE: doesn't work on Windows Phone store (waiting for Unity to fix their own bug).
                 If you plan to publish there you should use a regular transform.DOLocalPath.</p>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModulePhysics2D
                 * @memberof DG.Tweening.DOTweenModulePhysics2D
                 * @param   {UnityEngine.Rigidbody2D}           target        
                 * @param   {Array.<UnityEngine.Vector2>}       path          The waypoint to go through
                 * @param   {number}                            duration      The duration of the tween
                 * @param   {DG.Tweening.PathType}              pathType      The type of path: Linear (straight path), CatmullRom (curved CatmullRom path) or CubicBezier (curved with control points)
                 * @param   {DG.Tweening.PathMode}              pathMode      The path mode: 3D, side-scroller 2D, top-down 2D
                 * @param   {number}                            resolution    The resolution of the path: higher resolutions make for more detailed curved paths but are more expensive.
                 Defaults to 10, but a value of 5 is usually enough if you don't have dramatic long curves between waypoints
                 * @param   {?UnityEngine.Color}                gizmoColor    The color of the path (shown when gizmos are active in the Play panel and the tween is running)
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOLocalPath: function (target, path, duration, pathType, pathMode, resolution, gizmoColor) {
                    if (pathType === void 0) { pathType = 0; }
                    if (pathMode === void 0) { pathMode = 1; }
                    if (resolution === void 0) { resolution = 10; }
                    if (gizmoColor === void 0) { gizmoColor = null; }
                    if (resolution < 1) {
                        resolution = 1;
                    }
                    var len = path.length;
                    var path3D = System.Array.init(len, function (){
                        return new UnityEngine.Vector3();
                    }, UnityEngine.Vector3);
                    for (var i = 0; i < len; i = (i + 1) | 0) {
                        path3D[i] = UnityEngine.Vector3.FromVector2(path[i].$clone());
                    }
                    var trans = target.transform;
                    var t = DG.Tweening.TweenSettingsExtensions.SetUpdate$1(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, DG.Tweening.Plugins.Core.PathCore.Path, DG.Tweening.Plugins.Options.PathOptions, DG.Tweening.Plugins.PathPlugin.Get(), function () {
                        return trans.localPosition;
                    }, function (x) {
                        target.MovePosition$1(UnityEngine.Component.op_Equality(trans.parent, null) ? x.$clone() : trans.parent.TransformPoint$1(x));
                    }, new DG.Tweening.Plugins.Core.PathCore.Path.$ctor1(pathType, path3D, resolution, System.Nullable.lift1("$clone", gizmoColor)), duration), target), DG.Tweening.UpdateType.Fixed);

                    t.plugOptions.isRigidbody2D = true;
                    t.plugOptions.mode = pathMode;
                    t.plugOptions.useLocalPosition = true;
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics2D.DOLocalPath:static end.*/

                /*DG.Tweening.DOTweenModulePhysics2D.DOLocalPath$1:static start.*/
                DOLocalPath$1: function (target, path, duration, pathMode) {
                    if (pathMode === void 0) { pathMode = 1; }
                    var trans = target.transform;
                    var t = DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, DG.Tweening.Plugins.Core.PathCore.Path, DG.Tweening.Plugins.Options.PathOptions, DG.Tweening.Plugins.PathPlugin.Get(), function () {
                        return trans.localPosition;
                    }, function (x) {
                        target.MovePosition$1(UnityEngine.Component.op_Equality(trans.parent, null) ? x.$clone() : trans.parent.TransformPoint$1(x));
                    }, path, duration), target);

                    t.plugOptions.isRigidbody2D = true;
                    t.plugOptions.mode = pathMode;
                    t.plugOptions.useLocalPosition = true;
                    return t;
                },
                /*DG.Tweening.DOTweenModulePhysics2D.DOLocalPath$1:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenModulePhysics2D end.*/

    /*DG.Tweening.DOTweenModuleSprite start.*/
    Bridge.define("DG.Tweening.DOTweenModuleSprite", {
        statics: {
            methods: {
                /*DG.Tweening.DOTweenModuleSprite.DOColor:static start.*/
                /**
                 * Tweens a SpriteRenderer's color to the given value.
                 Also stores the spriteRenderer as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleSprite
                 * @memberof DG.Tweening.DOTweenModuleSprite
                 * @param   {UnityEngine.SpriteRenderer}        target      
                 * @param   {UnityEngine.Color}                 endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOColor: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$8(function () {
                        return target.color;
                    }, function (x) {
                        target.color = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleSprite.DOColor:static end.*/

                /*DG.Tweening.DOTweenModuleSprite.DOFade:static start.*/
                /**
                 * Tweens a Material's alpha color to the given value.
                 Also stores the spriteRenderer as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleSprite
                 * @memberof DG.Tweening.DOTweenModuleSprite
                 * @param   {UnityEngine.SpriteRenderer}        target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOFade: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.ToAlpha(function () {
                        return target.color;
                    }, function (x) {
                        target.color = x.$clone();
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleSprite.DOFade:static end.*/

                /*DG.Tweening.DOTweenModuleSprite.DOGradientColor:static start.*/
                /**
                 * Tweens a SpriteRenderer's color using the given gradient
                 (NOTE 1: only uses the colors of the gradient, not the alphas - NOTE 2: creates a Sequence, not a Tweener).
                 Also stores the image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleSprite
                 * @memberof DG.Tweening.DOTweenModuleSprite
                 * @param   {UnityEngine.SpriteRenderer}    target      
                 * @param   {pc.ColorGradient}              gradient    The gradient to use
                 * @param   {number}                        duration    The duration of the tween
                 * @return  {DG.Tweening.Sequence}
                 */
                DOGradientColor: function (target, gradient, duration) {
                    var s = DG.Tweening.DOTween.Sequence();
                    var colors = gradient.colorKeys;
                    var len = colors.length;
                    for (var i = 0; i < len; i = (i + 1) | 0) {
                        var c = colors[i];
                        if (i === 0 && c.time <= 0) {
                            target.color = c.color.$clone();
                            continue;
                        }
                        var colorDuration = i === ((len - 1) | 0) ? duration - DG.Tweening.TweenExtensions.Duration(s, false) : duration * (i === 0 ? c.time : c.time - colors[((i - 1) | 0)].time);
                        DG.Tweening.TweenSettingsExtensions.Append(s, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), DG.Tweening.DOTweenModuleSprite.DOColor(target, c.color.$clone(), colorDuration), DG.Tweening.Ease.Linear));
                    }
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Sequence, s, target);
                    return s;
                },
                /*DG.Tweening.DOTweenModuleSprite.DOGradientColor:static end.*/

                /*DG.Tweening.DOTweenModuleSprite.DOBlendableColor:static start.*/
                /**
                 * Tweens a SpriteRenderer's color to the given value,
                 in a way that allows other DOBlendableColor tweens to work together on the same target,
                 instead than fight each other as multiple DOColor would do.
                 Also stores the SpriteRenderer as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleSprite
                 * @memberof DG.Tweening.DOTweenModuleSprite
                 * @param   {UnityEngine.SpriteRenderer}    target      
                 * @param   {UnityEngine.Color}             endValue    The value to tween to
                 * @param   {number}                        duration    The duration of the tween
                 * @return  {DG.Tweening.Tweener}
                 */
                DOBlendableColor: function (target, endValue, duration) {
                    var $t;
                    endValue = ($t = target.color, new pc.Color( endValue.r - $t.r, endValue.g - $t.g, endValue.b - $t.b, endValue.a - $t.a ));
                    var to = new pc.Color( 0, 0, 0, 0 );
                    return DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), DG.Tweening.Core.Extensions.Blendable(UnityEngine.Color, UnityEngine.Color, DG.Tweening.Plugins.Options.ColorOptions, DG.Tweening.DOTween.To$8(function () {
                        return to;
                    }, function (x) {
                        var $t1;
                        var diff = new pc.Color( x.r - to.r, x.g - to.g, x.b - to.b, x.a - to.a );
                        to = x.$clone();
                        target.color = ($t1 = target.color.$clone(), new pc.Color( $t1.r + diff.$clone().r, $t1.g + diff.$clone().g, $t1.b + diff.$clone().b, $t1.a + diff.$clone().a ));
                    }, endValue.$clone(), duration)), target);
                },
                /*DG.Tweening.DOTweenModuleSprite.DOBlendableColor:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenModuleSprite end.*/

    /*DG.Tweening.DOTweenModuleUI start.*/
    Bridge.define("DG.Tweening.DOTweenModuleUI", {
        statics: {
            methods: {
                /*DG.Tweening.DOTweenModuleUI.DOFade:static start.*/
                /**
                 * Tweens a CanvasGroup's alpha color to the given value.
                 Also stores the canvasGroup as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.CanvasGroup}           target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOFade: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$4(function () {
                        return target.alpha;
                    }, function (x) {
                        target.alpha = x;
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOFade:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOFade$1:static start.*/
                /**
                 * Tweens an Graphic's alpha color to the given value.
                 Also stores the image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Graphic}            target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOFade$1: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.ToAlpha(function () {
                        return target.color;
                    }, function (x) {
                        target.color = x.$clone();
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOFade$1:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOFade$2:static start.*/
                /**
                 * Tweens an Image's alpha color to the given value.
                 Also stores the image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Image}              target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOFade$2: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.ToAlpha(function () {
                        return target.color;
                    }, function (x) {
                        target.color = x.$clone();
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOFade$2:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOFade$3:static start.*/
                /**
                 * Tweens a Outline's effectColor alpha to the given value.
                 Also stores the Outline as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Outline}            target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOFade$3: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.ToAlpha(function () {
                        return target.effectColor;
                    }, function (x) {
                        target.effectColor = x.$clone();
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOFade$3:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOFade$4:static start.*/
                /**
                 * Tweens a Text's alpha color to the given value.
                 Also stores the Text as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Text}               target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOFade$4: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.ToAlpha(function () {
                        return target.color;
                    }, function (x) {
                        target.color = x.$clone();
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOFade$4:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOColor:static start.*/
                /**
                 * Tweens an Graphic's color to the given value.
                 Also stores the image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Graphic}            target      
                 * @param   {UnityEngine.Color}                 endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOColor: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$8(function () {
                        return target.color;
                    }, function (x) {
                        target.color = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOColor:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOColor$1:static start.*/
                /**
                 * Tweens an Image's color to the given value.
                 Also stores the image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Image}              target      
                 * @param   {UnityEngine.Color}                 endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOColor$1: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$8(function () {
                        return target.color;
                    }, function (x) {
                        target.color = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOColor$1:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOColor$2:static start.*/
                /**
                 * Tweens a Outline's effectColor to the given value.
                 Also stores the Outline as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Outline}            target      
                 * @param   {UnityEngine.Color}                 endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOColor$2: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$8(function () {
                        return target.effectColor;
                    }, function (x) {
                        target.effectColor = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOColor$2:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOColor$3:static start.*/
                /**
                 * Tweens a Text's color to the given value.
                 Also stores the Text as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Text}               target      
                 * @param   {UnityEngine.Color}                 endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOColor$3: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$8(function () {
                        return target.color;
                    }, function (x) {
                        target.color = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOColor$3:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOFillAmount:static start.*/
                /**
                 * Tweens an Image's fillAmount to the given value.
                 Also stores the image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Image}              target      
                 * @param   {number}                            endValue    The end value to reach (0 to 1)
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOFillAmount: function (target, endValue, duration) {
                    if (endValue > 1) {
                        endValue = 1;
                    } else {
                        if (endValue < 0) {
                            endValue = 0;
                        }
                    }
                    var t = DG.Tweening.DOTween.To$4(function () {
                        return target.fillAmount;
                    }, function (x) {
                        target.fillAmount = x;
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOFillAmount:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOGradientColor:static start.*/
                /**
                 * Tweens an Image's colors using the given gradient
                 (NOTE 1: only uses the colors of the gradient, not the alphas - NOTE 2: creates a Sequence, not a Tweener).
                 Also stores the image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Image}    target      
                 * @param   {pc.ColorGradient}        gradient    The gradient to use
                 * @param   {number}                  duration    The duration of the tween
                 * @return  {DG.Tweening.Sequence}
                 */
                DOGradientColor: function (target, gradient, duration) {
                    var s = DG.Tweening.DOTween.Sequence();
                    var colors = gradient.colorKeys;
                    var len = colors.length;
                    for (var i = 0; i < len; i = (i + 1) | 0) {
                        var c = colors[i];
                        if (i === 0 && c.time <= 0) {
                            target.color = c.color.$clone();
                            continue;
                        }
                        var colorDuration = i === ((len - 1) | 0) ? duration - DG.Tweening.TweenExtensions.Duration(s, false) : duration * (i === 0 ? c.time : c.time - colors[((i - 1) | 0)].time);
                        DG.Tweening.TweenSettingsExtensions.Append(s, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), DG.Tweening.DOTweenModuleUI.DOColor$1(target, c.color.$clone(), colorDuration), DG.Tweening.Ease.Linear));
                    }
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Sequence, s, target);
                    return s;
                },
                /*DG.Tweening.DOTweenModuleUI.DOGradientColor:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOFlexibleSize:static start.*/
                /**
                 * Tweens an LayoutElement's flexibleWidth/Height to the given value.
                 Also stores the LayoutElement as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.LayoutElement}      target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOFlexibleSize: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return new pc.Vec2( target.flexibleWidth, target.flexibleHeight );
                    }, function (x) {
                        target.flexibleWidth = x.x;
                        target.flexibleHeight = x.y;
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$9(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOFlexibleSize:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOMinSize:static start.*/
                /**
                 * Tweens an LayoutElement's minWidth/Height to the given value.
                 Also stores the LayoutElement as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.LayoutElement}      target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOMinSize: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return new pc.Vec2( target.minWidth, target.minHeight );
                    }, function (x) {
                        target.minWidth = x.x;
                        target.minHeight = x.y;
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$9(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOMinSize:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOPreferredSize:static start.*/
                /**
                 * Tweens an LayoutElement's preferredWidth/Height to the given value.
                 Also stores the LayoutElement as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.LayoutElement}      target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOPreferredSize: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return new pc.Vec2( target.preferredWidth, target.preferredHeight );
                    }, function (x) {
                        target.preferredWidth = x.x;
                        target.preferredHeight = x.y;
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$9(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOPreferredSize:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOScale:static start.*/
                /**
                 * Tweens a Outline's effectDistance to the given value.
                 Also stores the Outline as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Outline}            target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOScale: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.effectDistance;
                    }, function (x) {
                        target.effectDistance = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOScale:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos:static start.*/
                /**
                 * Tweens a RectTransform's anchoredPosition to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOAnchorPos: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.anchoredPosition;
                    }, function (x) {
                        target.anchoredPosition = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$9(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOAnchorPosX:static start.*/
                /**
                 * Tweens a RectTransform's anchoredPosition X to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOAnchorPosX: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.anchoredPosition;
                    }, function (x) {
                        target.anchoredPosition = x.$clone();
                    }, new pc.Vec2( endValue, 0 ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(t, DG.Tweening.AxisConstraint.X, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOAnchorPosX:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOAnchorPosY:static start.*/
                /**
                 * Tweens a RectTransform's anchoredPosition Y to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOAnchorPosY: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.anchoredPosition;
                    }, function (x) {
                        target.anchoredPosition = x.$clone();
                    }, new pc.Vec2( 0, endValue ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(t, DG.Tweening.AxisConstraint.Y, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOAnchorPosY:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos3D:static start.*/
                /**
                 * Tweens a RectTransform's anchoredPosition3D to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {UnityEngine.Vector3}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOAnchorPos3D: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$12(function () {
                        return target.anchoredPosition3D;
                    }, function (x) {
                        target.anchoredPosition3D = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$13(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos3D:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos3DX:static start.*/
                /**
                 * Tweens a RectTransform's anchoredPosition3D X to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOAnchorPos3DX: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$12(function () {
                        return target.anchoredPosition3D;
                    }, function (x) {
                        target.anchoredPosition3D = x.$clone();
                    }, new pc.Vec3( endValue, 0, 0 ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$12(t, DG.Tweening.AxisConstraint.X, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos3DX:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos3DY:static start.*/
                /**
                 * Tweens a RectTransform's anchoredPosition3D Y to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOAnchorPos3DY: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$12(function () {
                        return target.anchoredPosition3D;
                    }, function (x) {
                        target.anchoredPosition3D = x.$clone();
                    }, new pc.Vec3( 0, endValue, 0 ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$12(t, DG.Tweening.AxisConstraint.Y, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos3DY:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos3DZ:static start.*/
                /**
                 * Tweens a RectTransform's anchoredPosition3D Z to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOAnchorPos3DZ: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$12(function () {
                        return target.anchoredPosition3D;
                    }, function (x) {
                        target.anchoredPosition3D = x.$clone();
                    }, new pc.Vec3( 0, 0, endValue ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$12(t, DG.Tweening.AxisConstraint.Z, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOAnchorPos3DZ:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOAnchorMax:static start.*/
                /**
                 * Tweens a RectTransform's anchorMax to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOAnchorMax: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.anchorMax;
                    }, function (x) {
                        target.anchorMax = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$9(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOAnchorMax:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOAnchorMin:static start.*/
                /**
                 * Tweens a RectTransform's anchorMin to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOAnchorMin: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.anchorMin;
                    }, function (x) {
                        target.anchorMin = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$9(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOAnchorMin:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOPivot:static start.*/
                /**
                 * Tweens a RectTransform's pivot to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOPivot: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.pivot;
                    }, function (x) {
                        target.pivot = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOPivot:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOPivotX:static start.*/
                /**
                 * Tweens a RectTransform's pivot X to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOPivotX: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.pivot;
                    }, function (x) {
                        target.pivot = x.$clone();
                    }, new pc.Vec2( endValue, 0 ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(t, DG.Tweening.AxisConstraint.X), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOPivotX:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOPivotY:static start.*/
                /**
                 * Tweens a RectTransform's pivot Y to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOPivotY: function (target, endValue, duration) {
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.pivot;
                    }, function (x) {
                        target.pivot = x.$clone();
                    }, new pc.Vec2( 0, endValue ), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(t, DG.Tweening.AxisConstraint.Y), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOPivotY:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOSizeDelta:static start.*/
                /**
                 * Tweens a RectTransform's sizeDelta to the given value.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target      
                 * @param   {UnityEngine.Vector2}               endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOSizeDelta: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.sizeDelta;
                    }, function (x) {
                        target.sizeDelta = x.$clone();
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$9(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOSizeDelta:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOPunchAnchorPos:static start.*/
                /**
                 * Punches a RectTransform's anchoredPosition towards the given direction and then back to the starting one
                 as if it was connected to the starting position via an elastic.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}    target        
                 * @param   {UnityEngine.Vector2}          punch         The direction and strength of the punch (added to the RectTransform's current position)
                 * @param   {number}                       duration      The duration of the tween
                 * @param   {number}                       vibrato       Indicates how much will the punch vibrate
                 * @param   {number}                       elasticity    Represents how much (0 to 1) the vector will go beyond the starting position when bouncing backwards.
                 1 creates a full oscillation between the punch direction and the opposite direction,
                 while 0 oscillates only between the punch and the start position
                 * @param   {boolean}                      snapping      If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Tweener}
                 */
                DOPunchAnchorPos: function (target, punch, duration, vibrato, elasticity, snapping) {
                    if (vibrato === void 0) { vibrato = 10; }
                    if (elasticity === void 0) { elasticity = 1.0; }
                    if (snapping === void 0) { snapping = false; }
                    return DG.Tweening.TweenSettingsExtensions.SetOptions$11(DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,System.Array.type(UnityEngine.Vector3),DG.Tweening.Plugins.Options.Vector3ArrayOptions), DG.Tweening.DOTween.Punch(function () {
                        return UnityEngine.Vector3.FromVector2(target.anchoredPosition);
                    }, function (x) {
                        target.anchoredPosition = UnityEngine.Vector2.FromVector3(x.$clone());
                    }, UnityEngine.Vector3.FromVector2(punch.$clone()), duration, vibrato, elasticity), target), snapping);
                },
                /*DG.Tweening.DOTweenModuleUI.DOPunchAnchorPos:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOShakeAnchorPos:static start.*/
                /**
                 * Shakes a RectTransform's anchoredPosition with the given values.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}          target            
                 * @param   {number}                             duration          The duration of the tween
                 * @param   {number}                             strength          The shake strength
                 * @param   {number}                             vibrato           Indicates how much will the shake vibrate
                 * @param   {number}                             randomness        Indicates how much the shake will be random (0 to 180 - values higher than 90 kind of suck, so beware). 
                 Setting it to 0 will shake along a single direction.
                 * @param   {boolean}                            snapping          If TRUE the tween will smoothly snap all values to integers
                 * @param   {boolean}                            fadeOut           If TRUE the shake will automatically fadeOut smoothly within the tween's duration, otherwise it will not
                 * @param   {DG.Tweening.ShakeRandomnessMode}    randomnessMode    Randomness mode
                 * @return  {DG.Tweening.Tweener}
                 */
                DOShakeAnchorPos: function (target, duration, strength, vibrato, randomness, snapping, fadeOut, randomnessMode) {
                    if (strength === void 0) { strength = 100.0; }
                    if (vibrato === void 0) { vibrato = 10; }
                    if (randomness === void 0) { randomness = 90.0; }
                    if (snapping === void 0) { snapping = false; }
                    if (fadeOut === void 0) { fadeOut = true; }
                    if (randomnessMode === void 0) { randomnessMode = 0; }
                    return DG.Tweening.TweenSettingsExtensions.SetOptions$11(DG.Tweening.Core.Extensions.SetSpecialStartupMode(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,System.Array.type(UnityEngine.Vector3),DG.Tweening.Plugins.Options.Vector3ArrayOptions), DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,System.Array.type(UnityEngine.Vector3),DG.Tweening.Plugins.Options.Vector3ArrayOptions), DG.Tweening.DOTween.Shake(function () {
                        return UnityEngine.Vector3.FromVector2(target.anchoredPosition);
                    }, function (x) {
                        target.anchoredPosition = UnityEngine.Vector2.FromVector3(x.$clone());
                    }, duration, strength, vibrato, randomness, true, fadeOut, randomnessMode), target), DG.Tweening.Core.Enums.SpecialStartupMode.SetShake), snapping);
                },
                /*DG.Tweening.DOTweenModuleUI.DOShakeAnchorPos:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOShakeAnchorPos$1:static start.*/
                /**
                 * Shakes a RectTransform's anchoredPosition with the given values.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}          target            
                 * @param   {number}                             duration          The duration of the tween
                 * @param   {UnityEngine.Vector2}                strength          The shake strength on each axis
                 * @param   {number}                             vibrato           Indicates how much will the shake vibrate
                 * @param   {number}                             randomness        Indicates how much the shake will be random (0 to 180 - values higher than 90 kind of suck, so beware). 
                 Setting it to 0 will shake along a single direction.
                 * @param   {boolean}                            snapping          If TRUE the tween will smoothly snap all values to integers
                 * @param   {boolean}                            fadeOut           If TRUE the shake will automatically fadeOut smoothly within the tween's duration, otherwise it will not
                 * @param   {DG.Tweening.ShakeRandomnessMode}    randomnessMode    Randomness mode
                 * @return  {DG.Tweening.Tweener}
                 */
                DOShakeAnchorPos$1: function (target, duration, strength, vibrato, randomness, snapping, fadeOut, randomnessMode) {
                    if (vibrato === void 0) { vibrato = 10; }
                    if (randomness === void 0) { randomness = 90.0; }
                    if (snapping === void 0) { snapping = false; }
                    if (fadeOut === void 0) { fadeOut = true; }
                    if (randomnessMode === void 0) { randomnessMode = 0; }
                    return DG.Tweening.TweenSettingsExtensions.SetOptions$11(DG.Tweening.Core.Extensions.SetSpecialStartupMode(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,System.Array.type(UnityEngine.Vector3),DG.Tweening.Plugins.Options.Vector3ArrayOptions), DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,System.Array.type(UnityEngine.Vector3),DG.Tweening.Plugins.Options.Vector3ArrayOptions), DG.Tweening.DOTween.Shake$1(function () {
                        return UnityEngine.Vector3.FromVector2(target.anchoredPosition);
                    }, function (x) {
                        target.anchoredPosition = UnityEngine.Vector2.FromVector3(x.$clone());
                    }, duration, UnityEngine.Vector3.FromVector2(strength.$clone()), vibrato, randomness, fadeOut, randomnessMode), target), DG.Tweening.Core.Enums.SpecialStartupMode.SetShake), snapping);
                },
                /*DG.Tweening.DOTweenModuleUI.DOShakeAnchorPos$1:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOJumpAnchorPos:static start.*/
                /**
                 * Tweens a RectTransform's anchoredPosition to the given value, while also applying a jump effect along the Y axis.
                 Returns a Sequence instead of a Tweener.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}    target       
                 * @param   {UnityEngine.Vector2}          endValue     The end value to reach
                 * @param   {number}                       jumpPower    Power of the jump (the max height of the jump is represented by this plus the final Y offset)
                 * @param   {number}                       numJumps     Total number of jumps
                 * @param   {number}                       duration     The duration of the tween
                 * @param   {boolean}                      snapping     If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Sequence}
                 */
                DOJumpAnchorPos: function (target, endValue, jumpPower, numJumps, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    if (numJumps < 1) {
                        numJumps = 1;
                    }
                    var startPosY = 0;
                    var offsetY = -1;
                    var offsetYSet = false;

                    // Separate Y Tween so we can elaborate elapsedPercentage on that insted of on the Sequence
                    // (in case users add a delay or other elements to the Sequence)
                    var s = DG.Tweening.DOTween.Sequence();
                    var yTween = DG.Tweening.TweenSettingsExtensions.OnStart(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetLoops$1(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetRelative(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(DG.Tweening.DOTween.To$11(function () {
                        return target.anchoredPosition;
                    }, function (x) {
                        target.anchoredPosition = x.$clone();
                    }, new pc.Vec2( 0, jumpPower ), duration / (Bridge.Int.mul(numJumps, 2))), DG.Tweening.AxisConstraint.Y, snapping), DG.Tweening.Ease.OutQuad)), Bridge.Int.mul(numJumps, 2), DG.Tweening.LoopType.Yoyo), function () {
                        startPosY = target.anchoredPosition.y;
                    });
                    DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Sequence, DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Sequence, DG.Tweening.TweenSettingsExtensions.Join(DG.Tweening.TweenSettingsExtensions.Append(s, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$8(DG.Tweening.DOTween.To$11(function () {
                        return target.anchoredPosition;
                    }, function (x) {
                        target.anchoredPosition = x.$clone();
                    }, new pc.Vec2( endValue.x, 0 ), duration), DG.Tweening.AxisConstraint.X, snapping), DG.Tweening.Ease.Linear)), yTween), target), DG.Tweening.DOTween.defaultEaseType);
                    DG.Tweening.TweenSettingsExtensions.OnUpdate(DG.Tweening.Sequence, s, function () {
                        if (!offsetYSet) {
                            offsetYSet = true;
                            offsetY = s.isRelative ? endValue.y : endValue.y - startPosY;
                        }
                        var pos = target.anchoredPosition.$clone();
                        pos.y += DG.Tweening.DOVirtual.EasedValue(0, offsetY, DG.Tweening.TweenExtensions.ElapsedDirectionalPercentage(s), DG.Tweening.Ease.OutQuad);
                        target.anchoredPosition = pos.$clone();
                    });
                    return s;
                },
                /*DG.Tweening.DOTweenModuleUI.DOJumpAnchorPos:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DONormalizedPos:static start.*/
                /**
                 * Tweens a ScrollRect's horizontal/verticalNormalizedPosition to the given value.
                 Also stores the ScrollRect as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.ScrollRect}    target      
                 * @param   {UnityEngine.Vector2}          endValue    The end value to reach
                 * @param   {number}                       duration    The duration of the tween
                 * @param   {boolean}                      snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Tweener}
                 */
                DONormalizedPos: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    return DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$9(DG.Tweening.DOTween.To$11(function () {
                        return new pc.Vec2( target.horizontalNormalizedPosition, target.verticalNormalizedPosition );
                    }, function (x) {
                        target.horizontalNormalizedPosition = x.x;
                        target.verticalNormalizedPosition = x.y;
                    }, endValue.$clone(), duration), snapping), target);
                },
                /*DG.Tweening.DOTweenModuleUI.DONormalizedPos:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOHorizontalNormalizedPos:static start.*/
                /**
                 * Tweens a ScrollRect's horizontalNormalizedPosition to the given value.
                 Also stores the ScrollRect as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.ScrollRect}    target      
                 * @param   {number}                       endValue    The end value to reach
                 * @param   {number}                       duration    The duration of the tween
                 * @param   {boolean}                      snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Tweener}
                 */
                DOHorizontalNormalizedPos: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    return DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$2(DG.Tweening.DOTween.To$4(function () {
                        return target.horizontalNormalizedPosition;
                    }, function (x) {
                        target.horizontalNormalizedPosition = x;
                    }, endValue, duration), snapping), target);
                },
                /*DG.Tweening.DOTweenModuleUI.DOHorizontalNormalizedPos:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOVerticalNormalizedPos:static start.*/
                /**
                 * Tweens a ScrollRect's verticalNormalizedPosition to the given value.
                 Also stores the ScrollRect as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.ScrollRect}    target      
                 * @param   {number}                       endValue    The end value to reach
                 * @param   {number}                       duration    The duration of the tween
                 * @param   {boolean}                      snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Tweener}
                 */
                DOVerticalNormalizedPos: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    return DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$2(DG.Tweening.DOTween.To$4(function () {
                        return target.verticalNormalizedPosition;
                    }, function (x) {
                        target.verticalNormalizedPosition = x;
                    }, endValue, duration), snapping), target);
                },
                /*DG.Tweening.DOTweenModuleUI.DOVerticalNormalizedPos:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOValue:static start.*/
                /**
                 * Tweens a Slider's value to the given value.
                 Also stores the Slider as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Slider}             target      
                 * @param   {number}                            endValue    The end value to reach
                 * @param   {number}                            duration    The duration of the tween
                 * @param   {boolean}                           snapping    If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOValue: function (target, endValue, duration, snapping) {
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To$4(function () {
                        return target.value;
                    }, function (x) {
                        target.value = x;
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$2(t, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOValue:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOCounter:static start.*/
                /**
                 * Tweens a Text's text from one integer to another, with options for thousands separators
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Text}                 target                   
                 * @param   {number}                              fromValue                The value to start from
                 * @param   {number}                              endValue                 The end value to reach
                 * @param   {number}                              duration                 The duration of the tween
                 * @param   {boolean}                             addThousandsSeparator    If TRUE (default) also adds thousands separators
                 * @param   {System.Globalization.CultureInfo}    culture                  The {@link } to use (InvariantCulture if NULL)
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOCounter: function (target, fromValue, endValue, duration, addThousandsSeparator, culture) {
                    if (addThousandsSeparator === void 0) { addThousandsSeparator = true; }
                    if (culture === void 0) { culture = null; }
                    var v = fromValue;
                    var cInfo = !addThousandsSeparator ? null : culture || System.Globalization.CultureInfo.invariantCulture;
                    var t = DG.Tweening.DOTween.To$2(function () {
                        return v;
                    }, function (x) {
                        v = x;
                        target.text = addThousandsSeparator ? System.Int32.format(v, "N0", cInfo) : Bridge.toString(v);
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(System.Int32,System.Int32,DG.Tweening.Plugins.Options.NoOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOCounter:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOText:static start.*/
                /**
                 * Tweens a Text's text to the given value.
                 Also stores the Text as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Text}               target             
                 * @param   {string}                            endValue           The end string to tween to
                 * @param   {number}                            duration           The duration of the tween
                 * @param   {boolean}                           richTextEnabled    If TRUE (default), rich text will be interpreted correctly while animated,
                 otherwise all tags will be considered as normal text
                 * @param   {DG.Tweening.ScrambleMode}          scrambleMode       The type of scramble mode to use, if any
                 * @param   {string}                            scrambleChars      A string containing the characters to use for scrambling.
                 Use as many characters as possible (minimum 10) because DOTween uses a fast scramble mode which gives better results with more characters.
                 Leave it to NULL (default) to use default ones
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOText: function (target, endValue, duration, richTextEnabled, scrambleMode, scrambleChars) {
                    if (richTextEnabled === void 0) { richTextEnabled = true; }
                    if (scrambleMode === void 0) { scrambleMode = 0; }
                    if (scrambleChars === void 0) { scrambleChars = null; }
                    if (endValue == null) {
                        if (DG.Tweening.Core.Debugger.logPriority > 0) {
                            DG.Tweening.Core.Debugger.LogWarning("You can't pass a NULL string to DOText: an empty string will be used instead to avoid errors");
                        }
                        endValue = "";
                    }
                    var t = DG.Tweening.DOTween.To$5(function () {
                        return target.text;
                    }, function (x) {
                        target.text = x;
                    }, endValue, duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$3(t, richTextEnabled, scrambleMode, scrambleChars), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOText:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOBlendableColor:static start.*/
                /**
                 * Tweens a Graphic's color to the given value,
                 in a way that allows other DOBlendableColor tweens to work together on the same target,
                 instead than fight each other as multiple DOColor would do.
                 Also stores the Graphic as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Graphic}    target      
                 * @param   {UnityEngine.Color}         endValue    The value to tween to
                 * @param   {number}                    duration    The duration of the tween
                 * @return  {DG.Tweening.Tweener}
                 */
                DOBlendableColor: function (target, endValue, duration) {
                    var $t;
                    endValue = ($t = target.color, new pc.Color( endValue.r - $t.r, endValue.g - $t.g, endValue.b - $t.b, endValue.a - $t.a ));
                    var to = new pc.Color( 0, 0, 0, 0 );
                    return DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), DG.Tweening.Core.Extensions.Blendable(UnityEngine.Color, UnityEngine.Color, DG.Tweening.Plugins.Options.ColorOptions, DG.Tweening.DOTween.To$8(function () {
                        return to;
                    }, function (x) {
                        var $t1;
                        var diff = new pc.Color( x.r - to.r, x.g - to.g, x.b - to.b, x.a - to.a );
                        to = x.$clone();
                        target.color = ($t1 = target.color.$clone(), new pc.Color( $t1.r + diff.$clone().r, $t1.g + diff.$clone().g, $t1.b + diff.$clone().b, $t1.a + diff.$clone().a ));
                    }, endValue.$clone(), duration)), target);
                },
                /*DG.Tweening.DOTweenModuleUI.DOBlendableColor:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOBlendableColor$1:static start.*/
                /**
                 * Tweens a Image's color to the given value,
                 in a way that allows other DOBlendableColor tweens to work together on the same target,
                 instead than fight each other as multiple DOColor would do.
                 Also stores the Image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Image}    target      
                 * @param   {UnityEngine.Color}       endValue    The value to tween to
                 * @param   {number}                  duration    The duration of the tween
                 * @return  {DG.Tweening.Tweener}
                 */
                DOBlendableColor$1: function (target, endValue, duration) {
                    var $t;
                    endValue = ($t = target.color, new pc.Color( endValue.r - $t.r, endValue.g - $t.g, endValue.b - $t.b, endValue.a - $t.a ));
                    var to = new pc.Color( 0, 0, 0, 0 );
                    return DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), DG.Tweening.Core.Extensions.Blendable(UnityEngine.Color, UnityEngine.Color, DG.Tweening.Plugins.Options.ColorOptions, DG.Tweening.DOTween.To$8(function () {
                        return to;
                    }, function (x) {
                        var $t1;
                        var diff = new pc.Color( x.r - to.r, x.g - to.g, x.b - to.b, x.a - to.a );
                        to = x.$clone();
                        target.color = ($t1 = target.color.$clone(), new pc.Color( $t1.r + diff.$clone().r, $t1.g + diff.$clone().g, $t1.b + diff.$clone().b, $t1.a + diff.$clone().a ));
                    }, endValue.$clone(), duration)), target);
                },
                /*DG.Tweening.DOTweenModuleUI.DOBlendableColor$1:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOBlendableColor$2:static start.*/
                /**
                 * Tweens a Text's color BY the given value,
                 in a way that allows other DOBlendableColor tweens to work together on the same target,
                 instead than fight each other as multiple DOColor would do.
                 Also stores the Text as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.UI.Text}    target      
                 * @param   {UnityEngine.Color}      endValue    The value to tween to
                 * @param   {number}                 duration    The duration of the tween
                 * @return  {DG.Tweening.Tweener}
                 */
                DOBlendableColor$2: function (target, endValue, duration) {
                    var $t;
                    endValue = ($t = target.color, new pc.Color( endValue.r - $t.r, endValue.g - $t.g, endValue.b - $t.b, endValue.a - $t.a ));
                    var to = new pc.Color( 0, 0, 0, 0 );
                    return DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), DG.Tweening.Core.Extensions.Blendable(UnityEngine.Color, UnityEngine.Color, DG.Tweening.Plugins.Options.ColorOptions, DG.Tweening.DOTween.To$8(function () {
                        return to;
                    }, function (x) {
                        var $t1;
                        var diff = new pc.Color( x.r - to.r, x.g - to.g, x.b - to.b, x.a - to.a );
                        to = x.$clone();
                        target.color = ($t1 = target.color.$clone(), new pc.Color( $t1.r + diff.$clone().r, $t1.g + diff.$clone().g, $t1.b + diff.$clone().b, $t1.a + diff.$clone().a ));
                    }, endValue.$clone(), duration)), target);
                },
                /*DG.Tweening.DOTweenModuleUI.DOBlendableColor$2:static end.*/

                /*DG.Tweening.DOTweenModuleUI.DOShapeCircle:static start.*/
                /**
                 * Tweens a RectTransform's anchoredPosition so that it draws a circle around the given center.
                 Also stores the RectTransform as the tween's target so it can be used for filtered operations.<p />
                 IMPORTANT: SetFrom(value) requires a {@link } instead of a float, where the X property represents the "from degrees value"
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI
                 * @memberof DG.Tweening.DOTweenModuleUI
                 * @param   {UnityEngine.RectTransform}         target             
                 * @param   {UnityEngine.Vector2}               center             Circle-center/pivot around which to rotate (in UI anchoredPosition coordinates)
                 * @param   {number}                            endValueDegrees    The end value degrees to reach (to rotate counter-clockwise pass a negative value)
                 * @param   {number}                            duration           The duration of the tween
                 * @param   {boolean}                           relativeCenter     If TRUE the {@link } coordinates will be considered as relative to the target's current anchoredPosition
                 * @param   {boolean}                           snapping           If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOShapeCircle: function (target, center, endValueDegrees, duration, relativeCenter, snapping) {
                    if (relativeCenter === void 0) { relativeCenter = false; }
                    if (snapping === void 0) { snapping = false; }
                    var t = DG.Tweening.DOTween.To(UnityEngine.Vector2, UnityEngine.Vector2, DG.Tweening.Plugins.CircleOptions, DG.Tweening.Plugins.CirclePlugin.Get(), function () {
                        return target.anchoredPosition;
                    }, function (x) {
                        target.anchoredPosition = x.$clone();
                    }, center.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Tweener, DG.Tweening.TweenSettingsExtensions.SetOptions$7(t, endValueDegrees, relativeCenter, snapping), target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUI.DOShapeCircle:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenModuleUI end.*/

    /*DG.Tweening.DOTweenModuleUI+Utils start.*/
    Bridge.define("DG.Tweening.DOTweenModuleUI.Utils", {
        $kind: 1002,
        statics: {
            methods: {
                /*DG.Tweening.DOTweenModuleUI+Utils.SwitchToRectTransform:static start.*/
                /**
                 * Converts the anchoredPosition of the first RectTransform to the second RectTransform,
                 taking into consideration offset, anchors and pivot, and returns the new anchoredPosition
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUI.Utils
                 * @memberof DG.Tweening.DOTweenModuleUI.Utils
                 * @param   {UnityEngine.RectTransform}    from    
                 * @param   {UnityEngine.RectTransform}    to
                 * @return  {UnityEngine.Vector2}
                 */
                SwitchToRectTransform: function (from, to) {
                    var localPoint = { v : new UnityEngine.Vector2() };
                    var fromPivotDerivedOffset = new pc.Vec2( from.rect.width * 0.5 + from.rect.xMin, from.rect.height * 0.5 + from.rect.yMin );
                    var screenP = UnityEngine.RectTransformUtility.WorldToScreenPoint(null, from.position);
                    screenP = screenP.$clone().add( fromPivotDerivedOffset.$clone() );
                    UnityEngine.RectTransformUtility.ScreenPointToLocalPointInRectangle(to, screenP, null, localPoint);
                    var pivotDerivedOffset = new pc.Vec2( to.rect.width * 0.5 + to.rect.xMin, to.rect.height * 0.5 + to.rect.yMin );
                    return to.anchoredPosition.$clone().add( localPoint.v ).sub( pivotDerivedOffset );
                },
                /*DG.Tweening.DOTweenModuleUI+Utils.SwitchToRectTransform:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenModuleUI+Utils end.*/

    /*DG.Tweening.DOTweenModuleUnityVersion start.*/
    /**
     * Shortcuts/functions that are not strictly related to specific Modules
     but are available only on some Unity versions
     *
     * @static
     * @abstract
     * @public
     * @class DG.Tweening.DOTweenModuleUnityVersion
     */
    Bridge.define("DG.Tweening.DOTweenModuleUnityVersion", {
        statics: {
            methods: {
                /*DG.Tweening.DOTweenModuleUnityVersion.DOGradientColor:static start.*/
                /**
                 * Tweens a Material's color using the given gradient
                 (NOTE 1: only uses the colors of the gradient, not the alphas - NOTE 2: creates a Sequence, not a Tweener).
                 Also stores the image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {UnityEngine.Material}    target      
                 * @param   {pc.ColorGradient}        gradient    The gradient to use
                 * @param   {number}                  duration    The duration of the tween
                 * @return  {DG.Tweening.Sequence}
                 */
                DOGradientColor: function (target, gradient, duration) {
                    var s = DG.Tweening.DOTween.Sequence();
                    var colors = gradient.colorKeys;
                    var len = colors.length;
                    for (var i = 0; i < len; i = (i + 1) | 0) {
                        var c = colors[i];
                        if (i === 0 && c.time <= 0) {
                            target.color = c.color.$clone();
                            continue;
                        }
                        var colorDuration = i === ((len - 1) | 0) ? duration - DG.Tweening.TweenExtensions.Duration(s, false) : duration * (i === 0 ? c.time : c.time - colors[((i - 1) | 0)].time);
                        DG.Tweening.TweenSettingsExtensions.Append(s, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), DG.Tweening.ShortcutExtensions.DOColor$3(target, c.color.$clone(), colorDuration), DG.Tweening.Ease.Linear));
                    }
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Sequence, s, target);
                    return s;
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.DOGradientColor:static end.*/

                /*DG.Tweening.DOTweenModuleUnityVersion.DOGradientColor$1:static start.*/
                /**
                 * Tweens a Material's named color property using the given gradient
                 (NOTE 1: only uses the colors of the gradient, not the alphas - NOTE 2: creates a Sequence, not a Tweener).
                 Also stores the image as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {UnityEngine.Material}    target      
                 * @param   {pc.ColorGradient}        gradient    The gradient to use
                 * @param   {string}                  property    The name of the material property to tween (like _Tint or _SpecColor)
                 * @param   {number}                  duration    The duration of the tween
                 * @return  {DG.Tweening.Sequence}
                 */
                DOGradientColor$1: function (target, gradient, property, duration) {
                    var s = DG.Tweening.DOTween.Sequence();
                    var colors = gradient.colorKeys;
                    var len = colors.length;
                    for (var i = 0; i < len; i = (i + 1) | 0) {
                        var c = colors[i];
                        if (i === 0 && c.time <= 0) {
                            target.SetColor$1(property, c.color);
                            continue;
                        }
                        var colorDuration = i === ((len - 1) | 0) ? duration - DG.Tweening.TweenExtensions.Duration(s, false) : duration * (i === 0 ? c.time : c.time - colors[((i - 1) | 0)].time);
                        DG.Tweening.TweenSettingsExtensions.Append(s, DG.Tweening.TweenSettingsExtensions.SetEase$2(DG.Tweening.Core.TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions), DG.Tweening.ShortcutExtensions.DOColor$4(target, c.color.$clone(), property, colorDuration), DG.Tweening.Ease.Linear));
                    }
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Sequence, s, target);
                    return s;
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.DOGradientColor$1:static end.*/

                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForCompletion:static start.*/
                /**
                 * Returns a {@link } that waits until the tween is killed or complete.
                 It can be used inside a coroutine as a yield.
                 <p>Example usage:</p><pre><code>yield return myTween.WaitForCompletion(true);</code></pre>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {DG.Tweening.Tween}                     t                               
                 * @param   {boolean}                               returnCustomYieldInstruction
                 * @return  {UnityEngine.CustomYieldInstruction}
                 */
                WaitForCompletion: function (t, returnCustomYieldInstruction) {
                    if (!t.active) {
                        if (DG.Tweening.Core.Debugger.logPriority > 0) {
                            DG.Tweening.Core.Debugger.LogInvalidTween(t);
                        }
                        return null;
                    }
                    return new DG.Tweening.DOTweenCYInstruction.WaitForCompletion(t);
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForCompletion:static end.*/

                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForRewind:static start.*/
                /**
                 * Returns a {@link } that waits until the tween is killed or rewinded.
                 It can be used inside a coroutine as a yield.
                 <p>Example usage:</p><pre><code>yield return myTween.WaitForRewind();</code></pre>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {DG.Tweening.Tween}                     t                               
                 * @param   {boolean}                               returnCustomYieldInstruction
                 * @return  {UnityEngine.CustomYieldInstruction}
                 */
                WaitForRewind: function (t, returnCustomYieldInstruction) {
                    if (!t.active) {
                        if (DG.Tweening.Core.Debugger.logPriority > 0) {
                            DG.Tweening.Core.Debugger.LogInvalidTween(t);
                        }
                        return null;
                    }
                    return new DG.Tweening.DOTweenCYInstruction.WaitForRewind(t);
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForRewind:static end.*/

                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForKill:static start.*/
                /**
                 * Returns a {@link } that waits until the tween is killed.
                 It can be used inside a coroutine as a yield.
                 <p>Example usage:</p><pre><code>yield return myTween.WaitForKill();</code></pre>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {DG.Tweening.Tween}                     t                               
                 * @param   {boolean}                               returnCustomYieldInstruction
                 * @return  {UnityEngine.CustomYieldInstruction}
                 */
                WaitForKill: function (t, returnCustomYieldInstruction) {
                    if (!t.active) {
                        if (DG.Tweening.Core.Debugger.logPriority > 0) {
                            DG.Tweening.Core.Debugger.LogInvalidTween(t);
                        }
                        return null;
                    }
                    return new DG.Tweening.DOTweenCYInstruction.WaitForKill(t);
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForKill:static end.*/

                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForElapsedLoops:static start.*/
                /**
                 * Returns a {@link } that waits until the tween is killed or has gone through the given amount of loops.
                 It can be used inside a coroutine as a yield.
                 <p>Example usage:</p><pre><code>yield return myTween.WaitForElapsedLoops(2);</code></pre>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {DG.Tweening.Tween}                     t                               
                 * @param   {number}                                elapsedLoops                    Elapsed loops to wait for
                 * @param   {boolean}                               returnCustomYieldInstruction
                 * @return  {UnityEngine.CustomYieldInstruction}
                 */
                WaitForElapsedLoops: function (t, elapsedLoops, returnCustomYieldInstruction) {
                    if (!t.active) {
                        if (DG.Tweening.Core.Debugger.logPriority > 0) {
                            DG.Tweening.Core.Debugger.LogInvalidTween(t);
                        }
                        return null;
                    }
                    return new DG.Tweening.DOTweenCYInstruction.WaitForElapsedLoops(t, elapsedLoops);
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForElapsedLoops:static end.*/

                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForPosition:static start.*/
                /**
                 * Returns a {@link } that waits until the tween is killed
                 or has reached the given time position (loops included, delays excluded).
                 It can be used inside a coroutine as a yield.
                 <p>Example usage:</p><pre><code>yield return myTween.WaitForPosition(2.5f);</code></pre>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {DG.Tweening.Tween}                     t                               
                 * @param   {number}                                position                        Position (loops included, delays excluded) to wait for
                 * @param   {boolean}                               returnCustomYieldInstruction
                 * @return  {UnityEngine.CustomYieldInstruction}
                 */
                WaitForPosition: function (t, position, returnCustomYieldInstruction) {
                    if (!t.active) {
                        if (DG.Tweening.Core.Debugger.logPriority > 0) {
                            DG.Tweening.Core.Debugger.LogInvalidTween(t);
                        }
                        return null;
                    }
                    return new DG.Tweening.DOTweenCYInstruction.WaitForPosition(t, position);
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForPosition:static end.*/

                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForStart:static start.*/
                /**
                 * Returns a {@link } that waits until the tween is killed or started
                 (meaning when the tween is set in a playing state the first time, after any eventual delay).
                 It can be used inside a coroutine as a yield.
                 <p>Example usage:</p><pre><code>yield return myTween.WaitForStart();</code></pre>
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {DG.Tweening.Tween}                     t                               
                 * @param   {boolean}                               returnCustomYieldInstruction
                 * @return  {UnityEngine.CustomYieldInstruction}
                 */
                WaitForStart: function (t, returnCustomYieldInstruction) {
                    if (!t.active) {
                        if (DG.Tweening.Core.Debugger.logPriority > 0) {
                            DG.Tweening.Core.Debugger.LogInvalidTween(t);
                        }
                        return null;
                    }
                    return new DG.Tweening.DOTweenCYInstruction.WaitForStart(t);
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.WaitForStart:static end.*/

                /*DG.Tweening.DOTweenModuleUnityVersion.DOOffset:static start.*/
                /**
                 * Tweens a Material's named texture offset property with the given ID to the given value.
                 Also stores the material as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {UnityEngine.Material}              target        
                 * @param   {UnityEngine.Vector2}               endValue      The end value to reach
                 * @param   {number}                            propertyID    The ID of the material property to tween (also called nameID in Unity's manual)
                 * @param   {number}                            duration      The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOOffset: function (target, endValue, propertyID, duration) {
                    if (!target.HasProperty(propertyID)) {
                        if (DG.Tweening.Core.Debugger.logPriority > 0) {
                            DG.Tweening.Core.Debugger.LogMissingMaterialProperty(propertyID);
                        }
                        return null;
                    }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.GetTextureOffset(propertyID);
                    }, function (x) {
                        target.SetTextureOffset(propertyID, x);
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.DOOffset:static end.*/

                /*DG.Tweening.DOTweenModuleUnityVersion.DOTiling:static start.*/
                /**
                 * Tweens a Material's named texture scale property with the given ID to the given value.
                 Also stores the material as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUnityVersion
                 * @memberof DG.Tweening.DOTweenModuleUnityVersion
                 * @param   {UnityEngine.Material}              target        
                 * @param   {UnityEngine.Vector2}               endValue      The end value to reach
                 * @param   {number}                            propertyID    The ID of the material property to tween (also called nameID in Unity's manual)
                 * @param   {number}                            duration      The duration of the tween
                 * @return  {DG.Tweening.Core.TweenerCore$3}
                 */
                DOTiling: function (target, endValue, propertyID, duration) {
                    if (!target.HasProperty(propertyID)) {
                        if (DG.Tweening.Core.Debugger.logPriority > 0) {
                            DG.Tweening.Core.Debugger.LogMissingMaterialProperty(propertyID);
                        }
                        return null;
                    }
                    var t = DG.Tweening.DOTween.To$11(function () {
                        return target.GetTextureScale(propertyID);
                    }, function (x) {
                        target.SetTextureScale(propertyID, x);
                    }, endValue.$clone(), duration);
                    DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions), t, target);
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUnityVersion.DOTiling:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenModuleUnityVersion end.*/

    /*DG.Tweening.DOTweenModuleUtils start.*/
    /**
     * Utility functions that deal with available Modules.
     Modules defines:
     - DOTAUDIO
     - DOTPHYSICS
     - DOTPHYSICS2D
     - DOTSPRITE
     - DOTUI
     Extra defines set and used for implementation of external assets:
     - DOTWEEN_TMP ► TextMesh Pro
     - DOTWEEN_TK2D ► 2D Toolkit
     *
     * @static
     * @abstract
     * @public
     * @class DG.Tweening.DOTweenModuleUtils
     */
    Bridge.define("DG.Tweening.DOTweenModuleUtils", {
        statics: {
            fields: {
                _initialized: false
            },
            methods: {
                /*DG.Tweening.DOTweenModuleUtils.Init:static start.*/
                /**
                 * Called via Reflection by DOTweenComponent on Awake
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenModuleUtils
                 * @memberof DG.Tweening.DOTweenModuleUtils
                 * @return  {void}
                 */
                Init: function () {
                    if (DG.Tweening.DOTweenModuleUtils._initialized) {
                        return;
                    }

                    DG.Tweening.DOTweenModuleUtils._initialized = true;
                    DG.Tweening.Core.DOTweenExternalCommand.addSetOrientationOnPath(DG.Tweening.DOTweenModuleUtils.Physics.SetOrientationOnPath);

                },
                /*DG.Tweening.DOTweenModuleUtils.Init:static end.*/

                /*DG.Tweening.DOTweenModuleUtils.Preserver:static start.*/
                Preserver: function () {
                    var loadedAssemblies = System.AppDomain.getAssemblies();
                    var mi = Bridge.Reflection.getMembers(UnityEngine.MonoBehaviour, 8, 284, "Stub");
                },
                /*DG.Tweening.DOTweenModuleUtils.Preserver:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenModuleUtils end.*/

    /*DG.Tweening.DOTweenModuleUtils+Physics start.*/
    Bridge.define("DG.Tweening.DOTweenModuleUtils.Physics", {
        $kind: 1002,
        statics: {
            methods: {
                /*DG.Tweening.DOTweenModuleUtils+Physics.SetOrientationOnPath:static start.*/
                SetOrientationOnPath: function (options, t, newRot, trans) {
                    if (options.isRigidbody) {
                        Bridge.cast(t.target, UnityEngine.Rigidbody).rotation = newRot.$clone();
                    } else {
                        trans.rotation = newRot.$clone();
                    }
                },
                /*DG.Tweening.DOTweenModuleUtils+Physics.SetOrientationOnPath:static end.*/

                /*DG.Tweening.DOTweenModuleUtils+Physics.HasRigidbody2D:static start.*/
                HasRigidbody2D: function (target) {
                    return UnityEngine.Component.op_Inequality(target.GetComponent(UnityEngine.Rigidbody2D), null);
                },
                /*DG.Tweening.DOTweenModuleUtils+Physics.HasRigidbody2D:static end.*/

                /*DG.Tweening.DOTweenModuleUtils+Physics.HasRigidbody:static start.*/
                HasRigidbody: function (target) {
                    return UnityEngine.Component.op_Inequality(target.GetComponent(UnityEngine.Rigidbody), null);
                },
                /*DG.Tweening.DOTweenModuleUtils+Physics.HasRigidbody:static end.*/

                /*DG.Tweening.DOTweenModuleUtils+Physics.CreateDOTweenPathTween:static start.*/
                CreateDOTweenPathTween: function (target, tweenRigidbody, isLocal, path, duration, pathMode) {
                    var t = null;
                    var rBodyFoundAndTweened = false;
                    if (tweenRigidbody) {
                        var rBody = target.GetComponent(UnityEngine.Rigidbody);
                        if (UnityEngine.Component.op_Inequality(rBody, null)) {
                            rBodyFoundAndTweened = true;
                            t = isLocal ? DG.Tweening.DOTweenModulePhysics.DOLocalPath$1(rBody, path, duration, pathMode) : DG.Tweening.DOTweenModulePhysics.DOPath$1(rBody, path, duration, pathMode);
                        }
                    }
                    if (!rBodyFoundAndTweened && tweenRigidbody) {
                        var rBody2D = target.GetComponent(UnityEngine.Rigidbody2D);
                        if (UnityEngine.Component.op_Inequality(rBody2D, null)) {
                            rBodyFoundAndTweened = true;
                            t = isLocal ? DG.Tweening.DOTweenModulePhysics2D.DOLocalPath$1(rBody2D, path, duration, pathMode) : DG.Tweening.DOTweenModulePhysics2D.DOPath$1(rBody2D, path, duration, pathMode);
                        }
                    }
                    if (!rBodyFoundAndTweened) {
                        t = isLocal ? DG.Tweening.ShortcutExtensions.DOLocalPath(target.transform, path, duration, pathMode) : DG.Tweening.ShortcutExtensions.DOPath(target.transform, path, duration, pathMode);
                    }
                    return t;
                },
                /*DG.Tweening.DOTweenModuleUtils+Physics.CreateDOTweenPathTween:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenModuleUtils+Physics end.*/

    /*DG.Tweening.DOTweenProShortcuts start.*/
    Bridge.define("DG.Tweening.DOTweenProShortcuts", {
        statics: {
            ctors: {
                ctor: function () {
                    // Create stub instances of custom plugins, in order to allow IL2CPP to understand they must be included in the build
                    var stub = new DG.Tweening.Plugins.SpiralPlugin();
                }
            },
            methods: {
                /*DG.Tweening.DOTweenProShortcuts.DOSpiral$1:static start.*/
                /**
                 * Tweens a Transform's localPosition in a spiral shape.
                 Also stores the transform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenProShortcuts
                 * @memberof DG.Tweening.DOTweenProShortcuts
                 * @param   {UnityEngine.Transform}     target       
                 * @param   {number}                    duration     The duration of the tween
                 * @param   {?UnityEngine.Vector3}      axis         The axis around which the spiral will rotate
                 * @param   {DG.Tweening.SpiralMode}    mode         The type of spiral movement
                 * @param   {number}                    speed        Speed of the rotations
                 * @param   {number}                    frequency    Frequency of the rotation. Lower values lead to wider spirals
                 * @param   {number}                    depth        Indicates how much the tween should move along the spiral's axis
                 * @param   {boolean}                   snapping     If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Tweener}
                 */
                DOSpiral$1: function (target, duration, axis, mode, speed, frequency, depth, snapping) {
                    if (axis === void 0) { axis = null; }
                    if (mode === void 0) { mode = 0; }
                    if (speed === void 0) { speed = 1.0; }
                    if (frequency === void 0) { frequency = 10.0; }
                    if (depth === void 0) { depth = 0.0; }
                    if (snapping === void 0) { snapping = false; }
                    if (UnityEngine.Mathf.Approximately(speed, 0)) {
                        speed = 1;
                    }
                    if (pc.Vec3.equals( axis, null ) || pc.Vec3.equals( axis, pc.Vec3.ZERO.clone() )) {
                        axis = new pc.Vec3( 0, 0, 1 );
                    }

                    var t = DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.SpiralOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, UnityEngine.Vector3, DG.Tweening.Plugins.SpiralOptions, DG.Tweening.Plugins.SpiralPlugin.Get(), function () {
                        return target.localPosition;
                    }, function (x) {
                        target.localPosition = x.$clone();
                    }, System.Nullable.getValue(axis), duration), target);

                    t.plugOptions.mode = mode;
                    t.plugOptions.speed = speed;
                    t.plugOptions.frequency = frequency;
                    t.plugOptions.depth = depth;
                    t.plugOptions.snapping = snapping;
                    return t;
                },
                /*DG.Tweening.DOTweenProShortcuts.DOSpiral$1:static end.*/

                /*DG.Tweening.DOTweenProShortcuts.DOSpiral:static start.*/
                /**
                 * Tweens a Rigidbody's position in a spiral shape.
                 Also stores the transform as the tween's target so it can be used for filtered operations
                 *
                 * @static
                 * @public
                 * @this DG.Tweening.DOTweenProShortcuts
                 * @memberof DG.Tweening.DOTweenProShortcuts
                 * @param   {UnityEngine.Rigidbody}     target       
                 * @param   {number}                    duration     The duration of the tween
                 * @param   {?UnityEngine.Vector3}      axis         The axis around which the spiral will rotate
                 * @param   {DG.Tweening.SpiralMode}    mode         The type of spiral movement
                 * @param   {number}                    speed        Speed of the rotations
                 * @param   {number}                    frequency    Frequency of the rotation. Lower values lead to wider spirals
                 * @param   {number}                    depth        Indicates how much the tween should move along the spiral's axis
                 * @param   {boolean}                   snapping     If TRUE the tween will smoothly snap all values to integers
                 * @return  {DG.Tweening.Tweener}
                 */
                DOSpiral: function (target, duration, axis, mode, speed, frequency, depth, snapping) {
                    if (axis === void 0) { axis = null; }
                    if (mode === void 0) { mode = 0; }
                    if (speed === void 0) { speed = 1.0; }
                    if (frequency === void 0) { frequency = 10.0; }
                    if (depth === void 0) { depth = 0.0; }
                    if (snapping === void 0) { snapping = false; }
                    if (UnityEngine.Mathf.Approximately(speed, 0)) {
                        speed = 1;
                    }
                    if (pc.Vec3.equals( axis, null ) || pc.Vec3.equals( axis, pc.Vec3.ZERO.clone() )) {
                        axis = new pc.Vec3( 0, 0, 1 );
                    }

                    var t = DG.Tweening.TweenSettingsExtensions.SetTarget(DG.Tweening.Core.TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.SpiralOptions), DG.Tweening.DOTween.To(UnityEngine.Vector3, UnityEngine.Vector3, DG.Tweening.Plugins.SpiralOptions, DG.Tweening.Plugins.SpiralPlugin.Get(), function () {
                        return target.position;
                    }, Bridge.fn.cacheBind(target, target.MovePosition), System.Nullable.getValue(axis), duration), target);

                    t.plugOptions.mode = mode;
                    t.plugOptions.speed = speed;
                    t.plugOptions.frequency = frequency;
                    t.plugOptions.depth = depth;
                    t.plugOptions.snapping = snapping;
                    return t;
                },
                /*DG.Tweening.DOTweenProShortcuts.DOSpiral:static end.*/


            }
        }
    });
    /*DG.Tweening.DOTweenProShortcuts end.*/

    /*Joystick start.*/
    Bridge.define("Joystick", {
        inherits: [UnityEngine.MonoBehaviour,UnityEngine.EventSystems.IPointerDownHandler,UnityEngine.EventSystems.IDragHandler,UnityEngine.EventSystems.IPointerUpHandler],
        fields: {
            handleRange: 0,
            deadZone: 0,
            axisOptions: 0,
            snapX: false,
            snapY: false,
            background: null,
            handleTransform: null,
            baseRect: null,
            canvas: null,
            cam: null,
            input: null
        },
        props: {
            Horizontal: {
                get: function () {
                    return (this.snapX) ? this.SnapFloat(this.input.x, AxisOptions.Horizontal) : this.input.x;
                }
            },
            Vertical: {
                get: function () {
                    return (this.snapY) ? this.SnapFloat(this.input.y, AxisOptions.Vertical) : this.input.y;
                }
            },
            Direction: {
                get: function () {
                    return new pc.Vec2( this.Horizontal, this.Vertical );
                }
            },
            HandleRange: {
                get: function () {
                    return this.handleRange;
                },
                set: function (value) {
                    this.handleRange = Math.abs(value);
                }
            },
            DeadZone: {
                get: function () {
                    return this.deadZone;
                },
                set: function (value) {
                    this.deadZone = Math.abs(value);
                }
            },
            AxisOptions: {
                get: function () {
                    return this.AxisOptions;
                },
                set: function (value) {
                    this.axisOptions = value;
                }
            },
            SnapX: {
                get: function () {
                    return this.snapX;
                },
                set: function (value) {
                    this.snapX = value;
                }
            },
            SnapY: {
                get: function () {
                    return this.snapY;
                },
                set: function (value) {
                    this.snapY = value;
                }
            }
        },
        alias: [
            "OnPointerDown", "UnityEngine$EventSystems$IPointerDownHandler$OnPointerDown",
            "OnDrag", "UnityEngine$EventSystems$IDragHandler$OnDrag",
            "OnPointerUp", "UnityEngine$EventSystems$IPointerUpHandler$OnPointerUp"
        ],
        ctors: {
            init: function () {
                this.input = new UnityEngine.Vector2();
                this.handleRange = 1;
                this.deadZone = 0;
                this.axisOptions = AxisOptions.Both;
                this.snapX = false;
                this.snapY = false;
                this.input = pc.Vec2.ZERO.clone();
            }
        },
        methods: {
            /*Joystick.Start start.*/
            Start: function () {
                this.HandleRange = this.handleRange;
                this.DeadZone = this.deadZone;
                this.baseRect = this.GetComponent(UnityEngine.RectTransform);
                this.canvas = this.GetComponentInParent(UnityEngine.Canvas);
                if (UnityEngine.Component.op_Equality(this.canvas, null)) {
                    UnityEngine.Debug.LogError$2("The Joystick is not placed inside a canvas");
                }

                var center = new pc.Vec2( 0.5, 0.5 );
                this.background.pivot = center.$clone();
                this.handleTransform.anchorMin = center.$clone();
                this.handleTransform.anchorMax = center.$clone();
                this.handleTransform.pivot = center.$clone();
                this.handleTransform.anchoredPosition = pc.Vec2.ZERO.clone();
            },
            /*Joystick.Start end.*/

            /*Joystick.OnPointerDown start.*/
            OnPointerDown: function (eventData) {
                this.OnDrag(eventData);
            },
            /*Joystick.OnPointerDown end.*/

            /*Joystick.OnDrag start.*/
            OnDrag: function (eventData) {
                this.cam = null;
                if (this.canvas.renderMode === UnityEngine.RenderMode.ScreenSpaceCamera) {
                    this.cam = this.canvas.worldCamera;
                }

                var position = UnityEngine.RectTransformUtility.WorldToScreenPoint(this.cam, this.background.position);
                var radius = this.background.sizeDelta.$clone().scale( 1.0 / ( 2 ) );
                this.input = (eventData.position.$clone().sub( position )).div( (radius.$clone().scale( this.canvas.scaleFactor )) );
                this.FormatInput();
                this.HandleInput(this.input.length(), this.input.clone().normalize(), radius, this.cam);
                this.handleTransform.anchoredPosition = this.input.$clone().mul( radius ).scale( this.handleRange );
            },
            /*Joystick.OnDrag end.*/

            /*Joystick.HandleInput start.*/
            HandleInput: function (magnitude, normalised, radius, cam) {
                if (magnitude > this.deadZone) {
                    if (magnitude > 1) {
                        this.input = normalised.$clone();
                    }
                } else {
                    this.input = pc.Vec2.ZERO.clone();
                }
            },
            /*Joystick.HandleInput end.*/

            /*Joystick.FormatInput start.*/
            FormatInput: function () {
                if (this.axisOptions === AxisOptions.Horizontal) {
                    this.input = new pc.Vec2( this.input.x, 0.0 );
                } else {
                    if (this.axisOptions === AxisOptions.Vertical) {
                        this.input = new pc.Vec2( 0.0, this.input.y );
                    }
                }
            },
            /*Joystick.FormatInput end.*/

            /*Joystick.SnapFloat start.*/
            SnapFloat: function (value, snapAxis) {
                if (value === 0) {
                    return value;
                }

                if (this.axisOptions === AxisOptions.Both) {
                    var angle = pc.Vec2.angle( this.input, pc.Vec2.UP.clone() );
                    if (snapAxis === AxisOptions.Horizontal) {
                        if (angle < 22.5 || angle > 157.5) {
                            return 0;
                        } else {
                            return (value > 0) ? 1 : -1;
                        }
                    } else if (snapAxis === AxisOptions.Vertical) {
                        if (angle > 67.5 && angle < 112.5) {
                            return 0;
                        } else {
                            return (value > 0) ? 1 : -1;
                        }
                    }
                    return value;
                } else {
                    if (value > 0) {
                        return 1;
                    }
                    if (value < 0) {
                        return -1;
                    }
                }
                return 0;
            },
            /*Joystick.SnapFloat end.*/

            /*Joystick.OnPointerUp start.*/
            OnPointerUp: function (eventData) {
                this.input = pc.Vec2.ZERO.clone();
                this.handleTransform.anchoredPosition = pc.Vec2.ZERO.clone();
            },
            /*Joystick.OnPointerUp end.*/

            /*Joystick.ScreenPointToAnchoredPosition start.*/
            ScreenPointToAnchoredPosition: function (screenPosition) {
                var localPoint = { v : pc.Vec2.ZERO.clone() };
                if (UnityEngine.RectTransformUtility.ScreenPointToLocalPointInRectangle(this.baseRect, screenPosition, this.cam, localPoint)) {
                    var pivotOffset = this.baseRect.pivot.$clone().mul( this.baseRect.sizeDelta );
                    return localPoint.v.$clone().sub( (this.background.anchorMax.$clone().mul( this.baseRect.sizeDelta )) ).add( pivotOffset );
                }
                return pc.Vec2.ZERO.clone();
            },
            /*Joystick.ScreenPointToAnchoredPosition end.*/


        }
    });
    /*Joystick end.*/

    /*EndView start.*/
    Bridge.define("EndView", {
        inherits: [UnityEngine.MonoBehaviour],
        fields: {
            audioSource: null,
            trans_Container: null,
            txt_WinLose: null
        },
        methods: {
            /*EndView.ShowView start.*/
            ShowView: function (isWin) {
                if (isWin === void 0) { isWin = false; }
                this.txt_WinLose.text = isWin ? "YOU WIN" : "YOU LOSE";
                DG.Tweening.ShortcutExtensions.DOScale(this.trans_Container, 1, 0.5);
            },
            /*EndView.ShowView end.*/

            /*EndView.OnClick_CTA start.*/
            OnClick_CTA: function () {
                SystemManager.Instance.OnClick_CTA();
                this.audioSource.PlayOneShot(AudioManager.Instance.audClip_ClickBtn);
            },
            /*EndView.OnClick_CTA end.*/


        }
    });
    /*EndView end.*/

    /*FinishLine_Checker start.*/
    Bridge.define("FinishLine_Checker", {
        inherits: [UnityEngine.MonoBehaviour],
        methods: {
            /*FinishLine_Checker.OnTriggerEnter start.*/
            OnTriggerEnter: function (other) {
                if (!SystemManager.Instance.GameEnded) {
                    SystemManager.Instance.EndGame(UnityEngine.MonoBehaviour.op_Inequality(other.gameObject.GetComponent(PlayerController), null));
                }
            },
            /*FinishLine_Checker.OnTriggerEnter end.*/


        }
    });
    /*FinishLine_Checker end.*/

    /*IAmAnEmptyScriptJustToMakeCodelessProjectsCompileProperty start.*/
    Bridge.define("IAmAnEmptyScriptJustToMakeCodelessProjectsCompileProperty", {
        inherits: [UnityEngine.MonoBehaviour]
    });
    /*IAmAnEmptyScriptJustToMakeCodelessProjectsCompileProperty end.*/

    /*JoystickPlayerExample start.*/
    Bridge.define("JoystickPlayerExample", {
        inherits: [UnityEngine.MonoBehaviour],
        fields: {
            speed: 0,
            variableJoystick: null,
            rb: null
        },
        methods: {
            /*JoystickPlayerExample.FixedUpdate start.*/
            FixedUpdate: function () {
                var direction = new pc.Vec3( 0, 0, 1 ).clone().scale( this.variableJoystick.Vertical ).add( pc.Vec3.RIGHT.clone().clone().scale( this.variableJoystick.Horizontal ) );
                this.rb.AddForce$1(direction.$clone().clone().scale( this.speed ).clone().scale( UnityEngine.Time.fixedDeltaTime ), UnityEngine.ForceMode.VelocityChange);
            },
            /*JoystickPlayerExample.FixedUpdate end.*/


        }
    });
    /*JoystickPlayerExample end.*/

    /*JoystickSetterExample start.*/
    Bridge.define("JoystickSetterExample", {
        inherits: [UnityEngine.MonoBehaviour],
        fields: {
            variableJoystick: null,
            valueText: null,
            background: null,
            axisSprites: null
        },
        methods: {
            /*JoystickSetterExample.ModeChanged start.*/
            ModeChanged: function (index) {
                switch (index) {
                    case 0: 
                        this.variableJoystick.SetMode(JoystickType.Fixed);
                        break;
                    case 1: 
                        this.variableJoystick.SetMode(JoystickType.Floating);
                        break;
                    case 2: 
                        this.variableJoystick.SetMode(JoystickType.Dynamic);
                        break;
                    default: 
                        break;
                }
            },
            /*JoystickSetterExample.ModeChanged end.*/

            /*JoystickSetterExample.AxisChanged start.*/
            AxisChanged: function (index) {
                switch (index) {
                    case 0: 
                        this.variableJoystick.AxisOptions = AxisOptions.Both;
                        this.background.sprite = this.axisSprites[index];
                        break;
                    case 1: 
                        this.variableJoystick.AxisOptions = AxisOptions.Horizontal;
                        this.background.sprite = this.axisSprites[index];
                        break;
                    case 2: 
                        this.variableJoystick.AxisOptions = AxisOptions.Vertical;
                        this.background.sprite = this.axisSprites[index];
                        break;
                    default: 
                        break;
                }
            },
            /*JoystickSetterExample.AxisChanged end.*/

            /*JoystickSetterExample.SnapX start.*/
            SnapX: function (value) {
                this.variableJoystick.SnapX = value;
            },
            /*JoystickSetterExample.SnapX end.*/

            /*JoystickSetterExample.SnapY start.*/
            SnapY: function (value) {
                this.variableJoystick.SnapY = value;
            },
            /*JoystickSetterExample.SnapY end.*/

            /*JoystickSetterExample.Update start.*/
            Update: function () {
                this.valueText.text = "Current Value: " + this.variableJoystick.Direction;
            },
            /*JoystickSetterExample.Update end.*/


        }
    });
    /*JoystickSetterExample end.*/

    /*JoystickType start.*/
    Bridge.define("JoystickType", {
        $kind: 6,
        statics: {
            fields: {
                Fixed: 0,
                Floating: 1,
                Dynamic: 2
            }
        }
    });
    /*JoystickType end.*/

    /*PlayerController start.*/
    Bridge.define("PlayerController", {
        inherits: [UnityEngine.MonoBehaviour],
        fields: {
            constantForwardForce: 0,
            maxSpeed: 0,
            steerStrength: 0,
            brakeStrength: 0,
            baseGrip: 0,
            driftGripMultiplier: 0,
            driftTorqueMultiplier: 0,
            maxRotationAngle: 0,
            rb: null,
            steerAmount: 0,
            isBraking: false,
            currentGrip: 0,
            initialYaw: 0,
            joystick: null,
            kickOutForce: 0,
            driftSpeedThreshold: 0,
            driftSteerThreshold: 0,
            stuckRayLength: 0,
            unstuckMoveDistance: 0,
            raySpacing: 0,
            obstacleMask: null,
            stuckRayCheckInterval: 0,
            lastRayCheckTime: 0,
            stuckDuration: 0,
            maxStuckTime: 0,
            isBlocked: false
        },
        ctors: {
            init: function () {
                this.obstacleMask = new UnityEngine.LayerMask();
                this.constantForwardForce = 30.0;
                this.maxSpeed = 50.0;
                this.steerStrength = 80.0;
                this.brakeStrength = 30.0;
                this.baseGrip = 0.98;
                this.driftGripMultiplier = 0.7;
                this.driftTorqueMultiplier = 1.0;
                this.maxRotationAngle = 45.0;
                this.isBraking = false;
                this.kickOutForce = 3000.0;
                this.driftSpeedThreshold = 5.0;
                this.driftSteerThreshold = 0.5;
                this.stuckRayLength = 2.0;
                this.unstuckMoveDistance = 5.0;
                this.raySpacing = 1.0;
                this.stuckRayCheckInterval = 0.5;
                this.lastRayCheckTime = 0.0;
                this.stuckDuration = 0.0;
                this.maxStuckTime = 3.0;
            }
        },
        methods: {
            /*PlayerController.Awake start.*/
            Awake: function () {
                this.rb = this.GetComponent(UnityEngine.Rigidbody);
                this.currentGrip = this.baseGrip;
            },
            /*PlayerController.Awake end.*/

            /*PlayerController.Start start.*/
            Start: function () {
                this.initialYaw = this.transform.eulerAngles.y;
            },
            /*PlayerController.Start end.*/

            /*PlayerController.Update start.*/
            Update: function () {
                //if (!SystemManager.Instance.GameStarted || SystemManager.Instance.GameEnded)
                //    return;

                //steerAmount = -joystick.Horizontal;
                //ApplyForwardForce();
                //ApplySteering();
                //LimitRotation();
                //HandleDrift();
                //CheckStuckWithRaycast();
            },
            /*PlayerController.Update end.*/

            /*PlayerController.FixedUpdate start.*/
            FixedUpdate: function () {
                if (!SystemManager.Instance.GameStarted || SystemManager.Instance.GameEnded) {
                    return;
                }

                this.steerAmount = -this.joystick.Horizontal;
                this.ApplyForwardForce();
                this.ApplySteering();
                this.LimitRotation();
                this.HandleDrift();
                this.CheckStuckWithRaycast();
            },
            /*PlayerController.FixedUpdate end.*/

            /*PlayerController.CheckStuckWithRaycast start.*/
            CheckStuckWithRaycast: function () {

                if (UnityEngine.Time.time - this.lastRayCheckTime < this.stuckRayCheckInterval) {
                    return;
                }
                this.lastRayCheckTime = UnityEngine.Time.time;

                var origin = this.transform.position.$clone().add( pc.Vec3.UP.clone().clone().scale( 0.5 ) );
                var forwardDir = this.transform.forward.$clone();
                var hit = { v : new UnityEngine.RaycastHit() };

                this.isBlocked = UnityEngine.Physics.Raycast$3(origin, forwardDir, hit, this.stuckRayLength, UnityEngine.LayerMask.op_Implicit(this.obstacleMask.$clone()));
                UnityEngine.Debug.DrawRay$2(origin, forwardDir.$clone().clone().scale( this.stuckRayLength ), this.isBlocked ? new pc.Color( 1, 0, 0, 1 ) : new pc.Color( 0, 1, 0, 1 ), this.stuckRayCheckInterval);

                var isMoving = this.rb.velocity.length() > 0.5;

                if (this.isBlocked || !isMoving) {
                    this.stuckDuration += this.stuckRayCheckInterval;

                    if (this.stuckDuration >= this.maxStuckTime) {
                        var unstuckPosition = this.transform.position.$clone().sub( this.transform.forward.$clone().clone().scale( this.unstuckMoveDistance ) );
                        unstuckPosition.y = this.transform.position.y;
                        this.rb.MovePosition(unstuckPosition);

                        this.rb.velocity = pc.Vec3.ZERO.clone();
                        this.rb.angularVelocity = pc.Vec3.ZERO.clone();

                        this.stuckDuration = 0.0;
                    }
                } else {
                    this.stuckDuration = 0.0;
                }
            },
            /*PlayerController.CheckStuckWithRaycast end.*/

            /*PlayerController.ApplyForwardForce start.*/
            ApplyForwardForce: function () {
                if (this.isBlocked) {
                    return;
                }
                var forwardForce = this.transform.forward.$clone().clone().scale( this.constantForwardForce ).clone().scale( UnityEngine.Time.fixedDeltaTime );
                this.rb.AddForce$1(forwardForce, UnityEngine.ForceMode.Force);

                if (this.rb.velocity.length() > this.maxSpeed) {
                    this.rb.velocity = this.rb.velocity.clone().normalize().$clone().clone().scale( this.maxSpeed );
                }
            },
            /*PlayerController.ApplyForwardForce end.*/

            /*PlayerController.ApplySteering start.*/
            ApplySteering: function () {
                var torque = this.steerAmount * this.steerStrength * UnityEngine.Time.fixedDeltaTime;
                this.rb.AddTorque$1(this.transform.up.$clone().clone().scale( torque ), UnityEngine.ForceMode.Force);
            },
            /*PlayerController.ApplySteering end.*/

            /*PlayerController.HandleDrift start.*/
            HandleDrift: function () {
                var rightVelocity = this.rb.velocity.$clone().project( this.transform.right );
                this.currentGrip = this.baseGrip;

                var shouldDrift = Math.abs(this.steerAmount) > this.driftSteerThreshold && this.rb.velocity.length() > this.driftSpeedThreshold;

                if (shouldDrift) {

                    this.currentGrip *= this.driftGripMultiplier;


                    this.rb.velocity = this.rb.velocity.$clone().sub( rightVelocity.$clone().clone().scale( (1.0 - this.currentGrip) ) );


                    var driftTorque = this.steerAmount * this.steerStrength * this.driftTorqueMultiplier * UnityEngine.Time.fixedDeltaTime;
                    this.rb.AddTorque$1(this.transform.up.$clone().clone().scale( driftTorque ), UnityEngine.ForceMode.Force);


                    var kickDirection = this.transform.right.$clone().clone().scale( this.steerAmount );
                    this.rb.AddForce$1(kickDirection.$clone().clone().scale( this.kickOutForce ).clone().scale( UnityEngine.Time.fixedDeltaTime ), UnityEngine.ForceMode.Force);
                }


                this.rb.velocity = this.rb.velocity.$clone().sub( rightVelocity.$clone().clone().scale( (1.0 - this.currentGrip) ) );
                this.rb.angularVelocity = this.rb.angularVelocity.$clone().clone().scale( this.currentGrip );
            },
            /*PlayerController.HandleDrift end.*/

            /*PlayerController.LimitRotation start.*/
            LimitRotation: function () {
                var currentYaw = this.transform.eulerAngles.y;
                var deltaYaw = UnityEngine.Mathf.DeltaAngle(this.initialYaw, currentYaw);

                if (Math.abs(deltaYaw) > this.maxRotationAngle) {
                    var clampedYaw = this.initialYaw + Math.max(-this.maxRotationAngle, Math.min(deltaYaw, this.maxRotationAngle));
                    var clampedRotation = new pc.Vec3( this.transform.eulerAngles.x, clampedYaw, this.transform.eulerAngles.z );
                    this.rb.MoveRotation(new pc.Quat().setFromEulerAngles_Unity( clampedRotation.x, clampedRotation.y, clampedRotation.z ));
                    this.rb.angularVelocity = pc.Vec3.ZERO.clone();
                }
            },
            /*PlayerController.LimitRotation end.*/


        }
    });
    /*PlayerController end.*/

    /*RigidbodyDriftController start.*/
    Bridge.define("RigidbodyDriftController", {
        inherits: [UnityEngine.MonoBehaviour],
        fields: {
            constantForwardForce: 0,
            maxSpeed: 0,
            steerStrength: 0,
            brakeStrength: 0,
            baseGrip: 0,
            driftGripMultiplier: 0,
            driftTorqueMultiplier: 0,
            maxRotationAngle: 0,
            ultimate_Joystick: null,
            rb: null,
            steerAmount: 0,
            isBraking: false,
            currentGrip: 0,
            initialYaw: 0,
            joystick: null,
            kickOutForce: 0,
            driftSpeedThreshold: 0,
            driftSteerThreshold: 0
        },
        ctors: {
            init: function () {
                this.constantForwardForce = 30.0;
                this.maxSpeed = 50.0;
                this.steerStrength = 80.0;
                this.brakeStrength = 30.0;
                this.baseGrip = 0.98;
                this.driftGripMultiplier = 0.7;
                this.driftTorqueMultiplier = 1.0;
                this.maxRotationAngle = 45.0;
                this.isBraking = false;
                this.kickOutForce = 3000.0;
                this.driftSpeedThreshold = 5.0;
                this.driftSteerThreshold = 0.5;
            }
        },
        methods: {
            /*RigidbodyDriftController.Awake start.*/
            Awake: function () {
                this.rb = this.GetComponent(UnityEngine.Rigidbody);
                this.currentGrip = this.baseGrip;
            },
            /*RigidbodyDriftController.Awake end.*/

            /*RigidbodyDriftController.Start start.*/
            Start: function () {
                this.initialYaw = this.transform.eulerAngles.y;
            },
            /*RigidbodyDriftController.Start end.*/

            /*RigidbodyDriftController.Update start.*/
            Update: function () {
                this.steerAmount = -this.joystick.Horizontal;
                this.ApplyForwardForce();
                this.ApplySteering();
                this.LimitRotation();
                this.HandleDrift();
            },
            /*RigidbodyDriftController.Update end.*/

            /*RigidbodyDriftController.FixedUpdate start.*/
            FixedUpdate: function () {
                //ApplyForwardForce();
                //ApplySteering();
                //LimitRotation();
                //HandleDrift();
            },
            /*RigidbodyDriftController.FixedUpdate end.*/

            /*RigidbodyDriftController.ApplyForwardForce start.*/
            ApplyForwardForce: function () {
                var forwardForce = this.transform.forward.$clone().clone().scale( this.constantForwardForce ).clone().scale( UnityEngine.Time.fixedDeltaTime );
                this.rb.AddForce$1(forwardForce, UnityEngine.ForceMode.Force);

                if (this.rb.velocity.length() > this.maxSpeed) {
                    this.rb.velocity = this.rb.velocity.clone().normalize().$clone().clone().scale( this.maxSpeed );
                }
            },
            /*RigidbodyDriftController.ApplyForwardForce end.*/

            /*RigidbodyDriftController.ApplySteering start.*/
            ApplySteering: function () {
                var torque = this.steerAmount * this.steerStrength * UnityEngine.Time.fixedDeltaTime;
                this.rb.AddTorque$1(this.transform.up.$clone().clone().scale( torque ), UnityEngine.ForceMode.Force);
            },
            /*RigidbodyDriftController.ApplySteering end.*/

            /*RigidbodyDriftController.HandleDrift start.*/
            HandleDrift: function () {
                var rightVelocity = this.rb.velocity.$clone().project( this.transform.right );
                this.currentGrip = this.baseGrip;

                var shouldDrift = Math.abs(this.steerAmount) > this.driftSteerThreshold && this.rb.velocity.length() > this.driftSpeedThreshold;

                if (shouldDrift) {

                    this.currentGrip *= this.driftGripMultiplier;


                    this.rb.velocity = this.rb.velocity.$clone().sub( rightVelocity.$clone().clone().scale( (1.0 - this.currentGrip) ) );


                    var driftTorque = this.steerAmount * this.steerStrength * this.driftTorqueMultiplier * UnityEngine.Time.fixedDeltaTime;
                    this.rb.AddTorque$1(this.transform.up.$clone().clone().scale( driftTorque ), UnityEngine.ForceMode.Force);


                    var kickDirection = this.transform.right.$clone().clone().scale( this.steerAmount );
                    this.rb.AddForce$1(kickDirection.$clone().clone().scale( this.kickOutForce ).clone().scale( UnityEngine.Time.fixedDeltaTime ), UnityEngine.ForceMode.Force);
                }


                this.rb.velocity = this.rb.velocity.$clone().sub( rightVelocity.$clone().clone().scale( (1.0 - this.currentGrip) ) );
                this.rb.angularVelocity = this.rb.angularVelocity.$clone().clone().scale( this.currentGrip );
            },
            /*RigidbodyDriftController.HandleDrift end.*/

            /*RigidbodyDriftController.LimitRotation start.*/
            LimitRotation: function () {
                var currentYaw = this.transform.eulerAngles.y;
                var deltaYaw = UnityEngine.Mathf.DeltaAngle(this.initialYaw, currentYaw);

                if (Math.abs(deltaYaw) > this.maxRotationAngle) {
                    var clampedYaw = this.initialYaw + Math.max(-this.maxRotationAngle, Math.min(deltaYaw, this.maxRotationAngle));
                    var clampedRotation = new pc.Vec3( this.transform.eulerAngles.x, clampedYaw, this.transform.eulerAngles.z );
                    this.rb.MoveRotation(new pc.Quat().setFromEulerAngles_Unity( clampedRotation.x, clampedRotation.y, clampedRotation.z ));
                    this.rb.angularVelocity = pc.Vec3.ZERO.clone();
                }
            },
            /*RigidbodyDriftController.LimitRotation end.*/


        }
    });
    /*RigidbodyDriftController end.*/

    /*SystemManager start.*/
    Bridge.define("SystemManager", {
        inherits: [UnityEngine.MonoBehaviour],
        statics: {
            fields: {
                instance: null
            },
            props: {
                Instance: {
                    get: function () {
                        return SystemManager.instance;
                    }
                }
            }
        },
        fields: {
            view_UI_Tutorial: null,
            view_EndGame: null,
            joyStick: null,
            time_Delay_ShowEnd: 0,
            gameStarted: false,
            gameEnded: false
        },
        props: {
            GameStarted: {
                get: function () {
                    return this.gameStarted;
                }
            },
            GameEnded: {
                get: function () {
                    return this.gameEnded;
                }
            }
        },
        ctors: {
            init: function () {
                this.time_Delay_ShowEnd = 1.0;
            }
        },
        methods: {
            /*SystemManager.Awake start.*/
            Awake: function () {
                SystemManager.instance = this;
                this.SetDefault();
            },
            /*SystemManager.Awake end.*/

            /*SystemManager.SetDefault start.*/
            SetDefault: function () {
                this.view_UI_Tutorial.gameObject.SetActive(true);
                this.view_EndGame.gameObject.SetActive(false);
            },
            /*SystemManager.SetDefault end.*/

            /*SystemManager.EndGame start.*/
            EndGame: function (isWin) {
                this.gameEnded = true;
                Luna.Unity.LifeCycle.GameEnded();
                this.StartCoroutine$1(this.IE_Wait_ShowEndView(isWin));
            },
            /*SystemManager.EndGame end.*/

            /*SystemManager.IE_Wait_ShowEndView start.*/
            IE_Wait_ShowEndView: function (isWin) {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    $enumerator.current = new UnityEngine.WaitForSeconds(this.time_Delay_ShowEnd);
                                        $step = 1;
                                        return true;
                                }
                                case 1: {
                                    this.view_EndGame.gameObject.SetActive(true);
                                        this.view_EndGame.ShowView();

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*SystemManager.IE_Wait_ShowEndView end.*/

            /*SystemManager.OnClick_CTA start.*/
            OnClick_CTA: function () {
                Luna.Unity.Playable.InstallFullGame();
            },
            /*SystemManager.OnClick_CTA end.*/

            /*SystemManager.Update start.*/
            Update: function () {
                if (!this.gameStarted) {
                    if (this.joyStick.Horizontal !== 0) {
                        this.view_UI_Tutorial.gameObject.SetActive(false);
                        this.gameStarted = true;
                    }

                }
            },
            /*SystemManager.Update end.*/


        }
    });
    /*SystemManager end.*/

    /*UltimateJoystick start.*/
    Bridge.define("UltimateJoystick", {
        inherits: [UnityEngine.MonoBehaviour,UnityEngine.EventSystems.IPointerDownHandler,UnityEngine.EventSystems.IDragHandler,UnityEngine.EventSystems.IPointerUpHandler],
        statics: {
            fields: {
                UltimateJoysticks: null
            },
            ctors: {
                init: function () {
                    this.UltimateJoysticks = new (System.Collections.Generic.Dictionary$2(System.String,UltimateJoystick)).ctor();
                }
            },
            methods: {
                /*UltimateJoystick.JoystickConfirmed:static start.*/
                /**
                 * Returns with a confirmation about the existence of the targeted Ultimate Joystick.
                 *
                 * @static
                 * @private
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}     joystickName
                 * @return  {boolean}
                 */
                JoystickConfirmed: function (joystickName) {
                    // If the dictionary list doesn't contain this joystick name...
                    if (!UltimateJoystick.UltimateJoysticks.containsKey(joystickName)) {
                        // Log a warning to the user and return false.
                        UnityEngine.Debug.LogWarning$1("Ultimate Joystick\nNo Ultimate Joystick has been registered with the name: " + (joystickName || "") + ".");
                        return false;
                    }

                    // Return true because the dictionary does contain the joystick name.
                    return true;
                },
                /*UltimateJoystick.JoystickConfirmed:static end.*/

                /*UltimateJoystick.GetUltimateJoystick:static start.*/
                /**
                 * Returns the Ultimate Joystick of the targeted name if it exists within the scene.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}              joystickName    The Joystick Name of the desired Ultimate Joystick.
                 * @return  {UltimateJoystick}
                 */
                GetUltimateJoystick: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return null;
                    }

                    return UltimateJoystick.UltimateJoysticks.getItem(joystickName);
                },
                /*UltimateJoystick.GetUltimateJoystick:static end.*/

                /*UltimateJoystick.GetHorizontalAxis:static start.*/
                /**
                 * Returns a float value between -1 and 1 representing the horizontal value of the Ultimate Joystick.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}    joystickName    The name of the desired Ultimate Joystick.
                 * @return  {number}
                 */
                GetHorizontalAxis: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return 0.0;
                    }

                    return UltimateJoystick.UltimateJoysticks.getItem(joystickName).GetHorizontalAxis();
                },
                /*UltimateJoystick.GetHorizontalAxis:static end.*/

                /*UltimateJoystick.GetVerticalAxis:static start.*/
                /**
                 * Returns a float value between -1 and 1 representing the vertical value of the Ultimate Joystick.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}    joystickName    The name of the desired Ultimate Joystick.
                 * @return  {number}
                 */
                GetVerticalAxis: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return 0.0;
                    }

                    return UltimateJoystick.UltimateJoysticks.getItem(joystickName).GetVerticalAxis();
                },
                /*UltimateJoystick.GetVerticalAxis:static end.*/

                /*UltimateJoystick.GetHorizontalAxisRaw:static start.*/
                /**
                 * Returns a value of -1, 0 or 1 representing the raw horizontal value of the Ultimate Joystick.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}    joystickName    The name of the desired Ultimate Joystick.
                 * @return  {number}
                 */
                GetHorizontalAxisRaw: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return 0.0;
                    }

                    return UltimateJoystick.UltimateJoysticks.getItem(joystickName).GetHorizontalAxisRaw();
                },
                /*UltimateJoystick.GetHorizontalAxisRaw:static end.*/

                /*UltimateJoystick.GetVerticalAxisRaw:static start.*/
                /**
                 * Returns a value of -1, 0 or 1 representing the raw vertical value of the Ultimate Joystick.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}    joystickName    The name of the desired Ultimate Joystick.
                 * @return  {number}
                 */
                GetVerticalAxisRaw: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return 0.0;
                    }

                    return UltimateJoystick.UltimateJoysticks.getItem(joystickName).GetVerticalAxisRaw();
                },
                /*UltimateJoystick.GetVerticalAxisRaw:static end.*/

                /*UltimateJoystick.GetDistance:static start.*/
                /**
                 * Returns a float value between 0 and 1 representing the distance of the joystick from the base.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}    joystickName    The name of the desired Ultimate Joystick.
                 * @return  {number}
                 */
                GetDistance: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return 0.0;
                    }

                    return UltimateJoystick.UltimateJoysticks.getItem(joystickName).GetDistance();
                },
                /*UltimateJoystick.GetDistance:static end.*/

                /*UltimateJoystick.GetJoystickState:static start.*/
                /**
                 * Returns the current interaction state of the Ultimate Joystick.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}     joystickName    The name of the desired Ultimate Joystick.
                 * @return  {boolean}
                 */
                GetJoystickState: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return false;
                    }

                    return UltimateJoystick.UltimateJoysticks.getItem(joystickName).joystickState;
                },
                /*UltimateJoystick.GetJoystickState:static end.*/

                /*UltimateJoystick.GetTapCount:static start.*/
                /**
                 * Returns the current state of the tap count according to the options set.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}     joystickName    The name of the desired Ultimate Joystick.
                 * @return  {boolean}
                 */
                GetTapCount: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return false;
                    }

                    return UltimateJoystick.UltimateJoysticks.getItem(joystickName).GetTapCount();
                },
                /*UltimateJoystick.GetTapCount:static end.*/

                /*UltimateJoystick.DisableJoystick:static start.*/
                /**
                 * Disables the targeted Ultimate Joystick.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}    joystickName    The name of the desired Ultimate Joystick.
                 * @return  {void}
                 */
                DisableJoystick: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return;
                    }

                    UltimateJoystick.UltimateJoysticks.getItem(joystickName).DisableJoystick();
                },
                /*UltimateJoystick.DisableJoystick:static end.*/

                /*UltimateJoystick.EnableJoystick:static start.*/
                /**
                 * Enables the targeted Ultimate Joystick.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}    joystickName    The name of the desired Ultimate Joystick.
                 * @return  {void}
                 */
                EnableJoystick: function (joystickName) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return;
                    }

                    UltimateJoystick.UltimateJoysticks.getItem(joystickName).EnableJoystick();
                },
                /*UltimateJoystick.EnableJoystick:static end.*/

                /*UltimateJoystick.InputInRange:static start.*/
                /**
                 * Checks to see if the provided input is within range of the targeted Ultimate Joystick.
                 *
                 * @static
                 * @public
                 * @this UltimateJoystick
                 * @memberof UltimateJoystick
                 * @param   {string}                 joystickName     The name of the desired Ultimate Joystick.
                 * @param   {UnityEngine.Vector2}    inputPosition    The input value to check.
                 * @return  {boolean}
                 */
                InputInRange: function (joystickName, inputPosition) {
                    if (!UltimateJoystick.JoystickConfirmed(joystickName)) {
                        return false;
                    }

                    return UltimateJoystick.UltimateJoysticks.getItem(joystickName).InputInRange(inputPosition);
                },
                /*UltimateJoystick.InputInRange:static end.*/


            }
        },
        fields: {
            baseTrans: null,
            defaultPos: null,
            joystickCenter: null,
            joystickRect: null,
            joystickGroup: null,
            radius: 0,
            ParentCanvas: null,
            canvasRectTrans: null,
            joystickBase: null,
            joystick: null,
            scalingAxis: 0,
            anchor: 0,
            activationRange: 0,
            customActivationRange: false,
            activationWidth: 0,
            activationHeight: 0,
            activationPositionHorizontal: 0,
            activationPositionVertical: 0,
            joystickSize: 0,
            radiusModifier: 0,
            positionHorizontal: 0,
            positionVertical: 0,
            dynamicPositioning: false,
            gravity: 0,
            gravityActive: false,
            extendRadius: false,
            axis: 0,
            boundary: 0,
            deadZone: 0,
            tapCountOption: 0,
            tapCountDuration: 0,
            targetTapCount: 0,
            currentTapTime: 0,
            tapCount: 0,
            disableVisuals: false,
            inputTransition: false,
            transitionUntouchedDuration: 0,
            transitionTouchedDuration: 0,
            transitionUntouchedSpeed: 0,
            transitionTouchedSpeed: 0,
            useFade: false,
            fadeUntouched: 0,
            fadeTouched: 0,
            useScale: false,
            scaleTouched: 0,
            showHighlight: false,
            highlightColor: null,
            highlightBase: null,
            highlightJoystick: null,
            showTension: false,
            tensionColorNone: null,
            tensionColorFull: null,
            tensionType: 0,
            rotationOffset: 0,
            tensionDeadZone: 0,
            TensionAccents: null,
            joystickName: null,
            joystickState: false,
            tapCountAchieved: false,
            /**
             * Returns the current value of the horizontal axis.
             *
             * @instance
             * @public
             * @memberof UltimateJoystick
             * @function HorizontalAxis
             * @type number
             */
            HorizontalAxis: 0,
            /**
             * Returns the current value of the vertical axis.
             *
             * @instance
             * @public
             * @memberof UltimateJoystick
             * @function VerticalAxis
             * @type number
             */
            VerticalAxis: 0
        },
        events: {
            OnPointerDownCallback: null,
            OnPointerUpCallback: null,
            OnDragCallback: null,
            OnUpdatePositioning: null
        },
        alias: [
            "OnPointerDown", "UnityEngine$EventSystems$IPointerDownHandler$OnPointerDown",
            "OnDrag", "UnityEngine$EventSystems$IDragHandler$OnDrag",
            "OnPointerUp", "UnityEngine$EventSystems$IPointerUpHandler$OnPointerUp"
        ],
        ctors: {
            init: function () {
                this.defaultPos = new UnityEngine.Vector2();
                this.joystickCenter = new UnityEngine.Vector2();
                this.joystickRect = new UnityEngine.Rect();
                this.highlightColor = new UnityEngine.Color();
                this.tensionColorNone = new UnityEngine.Color();
                this.tensionColorFull = new UnityEngine.Color();
                this.defaultPos = pc.Vec2.ZERO.clone();
                this.joystickCenter = pc.Vec2.ZERO.clone();
                this.radius = 1.0;
                this.scalingAxis = UltimateJoystick.ScalingAxis.Height;
                this.anchor = UltimateJoystick.Anchor.Left;
                this.activationRange = 1.0;
                this.customActivationRange = false;
                this.activationWidth = 50.0;
                this.activationHeight = 75.0;
                this.activationPositionHorizontal = 0.0;
                this.activationPositionVertical = 0.0;
                this.joystickSize = 2.5;
                this.radiusModifier = 4.5;
                this.positionHorizontal = 5.0;
                this.positionVertical = 20.0;
                this.dynamicPositioning = false;
                this.gravity = 60.0;
                this.gravityActive = false;
                this.extendRadius = false;
                this.axis = UltimateJoystick.Axis.Both;
                this.boundary = UltimateJoystick.Boundary.Circular;
                this.deadZone = 0.0;
                this.tapCountOption = UltimateJoystick.TapCountOption.NoCount;
                this.tapCountDuration = 0.5;
                this.targetTapCount = 2;
                this.currentTapTime = 0.0;
                this.tapCount = 0;
                this.disableVisuals = false;
                this.inputTransition = false;
                this.transitionUntouchedDuration = 0.1;
                this.transitionTouchedDuration = 0.1;
                this.useFade = false;
                this.fadeUntouched = 1.0;
                this.fadeTouched = 0.5;
                this.useScale = false;
                this.scaleTouched = 0.9;
                this.showHighlight = false;
                this.highlightColor = new pc.Color( 1, 1, 1, 1 );
                this.showTension = false;
                this.tensionColorNone = new pc.Color( 1, 1, 1, 1 );
                this.tensionColorFull = new pc.Color( 1, 1, 1, 1 );
                this.tensionType = UltimateJoystick.TensionType.Directional;
                this.rotationOffset = 0.0;
                this.tensionDeadZone = 0.0;
                this.TensionAccents = new (System.Collections.Generic.List$1(UnityEngine.UI.Image)).ctor();
                this.joystickState = false;
                this.tapCountAchieved = false;
            }
        },
        methods: {
            /*UltimateJoystick.Awake start.*/
            Awake: function () {
                // If the game is not being run and the joystick name has been assigned...
                if (UnityEngine.Application.isPlaying && !Bridge.referenceEquals(this.joystickName, "")) {
                    // If the static dictionary has this joystick registered, then remove it from the list.
                    if (UltimateJoystick.UltimateJoysticks.containsKey(this.joystickName)) {
                        UltimateJoystick.UltimateJoysticks.remove(this.joystickName);
                    }

                    // Then register the joystick.
                    UltimateJoystick.UltimateJoysticks.add(this.joystickName, this);
                }
            },
            /*UltimateJoystick.Awake end.*/

            /*UltimateJoystick.Start start.*/
            Start: function () {
                // If the game is not running then return.
                if (!UnityEngine.Application.isPlaying) {
                    return;
                }


                // If the user wants to transition on different input...
                if (this.inputTransition) {
                    // Try to store the canvas group.
                    this.joystickGroup = this.GetComponent(UnityEngine.CanvasGroup);

                    // If the canvas group is still null, then add a canvas group component.
                    if (UnityEngine.MonoBehaviour.op_Equality(this.joystickGroup, null)) {
                        this.joystickGroup = this.baseTrans.gameObject.AddComponent(UnityEngine.CanvasGroup);
                    }

                    // Configure the transition speeds.
                    this.transitionUntouchedSpeed = 1.0 / this.transitionUntouchedDuration;
                    this.transitionTouchedSpeed = 1.0 / this.transitionTouchedDuration;
                }

                // If the parent canvas is null...
                if (UnityEngine.Component.op_Equality(this.ParentCanvas, null)) {
                    // Then try to get the parent canvas component.
                    this.UpdateParentCanvas();

                    // If it is still null, then log a error and return.
                    if (UnityEngine.Component.op_Equality(this.ParentCanvas, null)) {
                        UnityEngine.Debug.LogError$2("Ultimate Joystick\nThis component is not with a Canvas object. Disabling this component to avoid any errors.");
                        this.enabled = false;
                        return;
                    }
                }

                // If the parent canvas does not have a screen size updater, then add it.
                if (!UnityEngine.Object.op_Implicit(this.ParentCanvas.GetComponent(UltimateJoystickScreenSizeUpdater))) {
                    this.ParentCanvas.gameObject.AddComponent(UltimateJoystickScreenSizeUpdater);
                }

                // Update the size and placement of the joystick.
                this.UpdateJoystickPositioning();
            },
            /*UltimateJoystick.Start end.*/

            /*UltimateJoystick.OnPointerDown start.*/
            OnPointerDown: function (touchInfo) {
                // If the joystick is already in use, then return.
                if (this.joystickState) {
                    return;
                }

                // If the user wants a circular boundary but does not want a custom activation range...
                if (this.boundary === UltimateJoystick.Boundary.Circular && !this.customActivationRange) {
                    // distance = distance between the world position of the joystickBase cast to a local position of the ParentCanvas (* by scale factor) - half of the actual canvas size, and the input position.
                    var distance = UnityEngine.Vector2.FromVector3((this.ParentCanvas.transform.InverseTransformPoint(this.joystickBase.position).clone().scale( this.ParentCanvas.scaleFactor ))).add( ((this.canvasRectTrans.sizeDelta.$clone().scale( this.ParentCanvas.scaleFactor )).scale( 1.0 / ( 2 ) )) ).sub( touchInfo.position ).length();

                    // If the distance is out of range, then just return.
                    if (distance / (this.baseTrans.sizeDelta.x * this.ParentCanvas.scaleFactor) > 0.5) {
                        return;
                    }
                }

                // Set the joystick state since the joystick is being interacted with.
                this.joystickState = true;

                // If the user has gravity set and it's active then stop the current movement.
                if (this.gravity > 0 && this.gravityActive) {
                    this.StopCoroutine$1("GravityHandler");
                }

                // If dynamicPositioning or disableVisuals are enabled...
                if (this.dynamicPositioning || this.disableVisuals) {
                    // Then move the joystickBase to the position of the touch.
                    this.joystickBase.localPosition = UnityEngine.Vector3.FromVector2(UnityEngine.Vector2.FromVector3(this.baseTrans.InverseTransformPoint(this.ParentCanvas.transform.TransformPoint$1(UnityEngine.Vector3.FromVector2(touchInfo.position.$clone().scale( 1.0 / ( this.ParentCanvas.scaleFactor ) ))))).sub( (this.canvasRectTrans.sizeDelta.$clone().scale( 1.0 / ( 2 ) )) ));

                    // Set the joystick center so that the position can be calculated correctly.
                    this.UpdateJoystickCenter();
                }

                // If the user wants to show the input transitions...
                if (this.inputTransition) {
                    // If either of the transition durations are set to something other than 0, then start the coroutine to transition over time.
                    if (this.transitionUntouchedDuration > 0 || this.transitionTouchedDuration > 0) {
                        this.StartCoroutine$2("InputTransition");
                    } else {
                        // So just apply the touched alpha value.
                        if (this.useFade) {
                            this.joystickGroup.alpha = this.fadeTouched;
                        }

                        // And apply the touched scale.
                        if (this.useScale) {
                            this.joystickBase.localScale = new pc.Vec3( 1, 1, 1 ).clone().scale( this.scaleTouched );
                        }
                    }
                }

                // If the user is wanting to use any tap count...
                if (this.tapCountOption !== UltimateJoystick.TapCountOption.NoCount) {
                    // If the user is accumulating taps...
                    if (this.tapCountOption === UltimateJoystick.TapCountOption.Accumulate) {
                        // If the TapCountdown is not counting down...
                        if (this.currentTapTime <= 0) {
                            // Set tapCount to 1 since this is the initial touch and start the TapCountdown.
                            this.tapCount = 1;
                            this.StartCoroutine$2("TapCountdown");
                        } else {
                            this.tapCount = (this.tapCount + 1) | 0;
                        }

                        if (this.currentTapTime > 0 && this.tapCount >= this.targetTapCount) {
                            // Set the current time to 0 to interrupt the coroutine.
                            this.currentTapTime = 0;

                            // Start the delay of the reference for one frame.
                            this.StartCoroutine$2("TapCountDelay");
                        }
                    } else {
                        this.StartCoroutine$2("TapCountdown");
                    }
                }

                // Call ProcessInput with the current input information.
                this.ProcessInput(touchInfo.position.$clone());

                // Notify any subscribers that the OnPointerDown function has been called.
                if (!Bridge.staticEquals(this.OnPointerDownCallback, null)) {
                    this.OnPointerDownCallback();
                }
            },
            /*UltimateJoystick.OnPointerDown end.*/

            /*UltimateJoystick.OnDrag start.*/
            OnDrag: function (touchInfo) {
                // If the joystick has not been initialized properly, then return.
                if (!this.joystickState) {
                    return;
                }

                // Then call ProcessInput with the info with the current input information.
                this.ProcessInput(touchInfo.position.$clone());

                // Notify any subscribers that the OnDrag function has been called.
                if (!Bridge.staticEquals(this.OnDragCallback, null)) {
                    this.OnDragCallback();
                }
            },
            /*UltimateJoystick.OnDrag end.*/

            /*UltimateJoystick.OnPointerUp start.*/
            OnPointerUp: function (touchInfo) {
                // If the joystick has not been initialized properly, then return.
                if (!this.joystickState) {
                    return;
                }

                // Since the touch has lifted, set the state to false and reset the local pointerId.
                this.joystickState = false;

                // If dynamicPositioning, disableVisuals, or extendRadius are enabled...
                if (this.dynamicPositioning || this.disableVisuals || this.extendRadius) {
                    // The joystickBase needs to be reset back to the default position.
                    this.joystickBase.localPosition = UnityEngine.Vector3.FromVector2(this.defaultPos.$clone());

                    // Reset the joystick center since the touch has been released.
                    this.UpdateJoystickCenter();
                }

                // If the user has the gravity set to something more than 0 but less than 60, begin GravityHandler().
                if (this.gravity > 0 && this.gravity < 60) {
                    this.StartCoroutine$2("GravityHandler");
                } else {
                    // Reset the joystick's position back to center.
                    this.joystick.localPosition = pc.Vec3.ZERO.clone();

                    // If the user is wanting to show tension, then reset that here.
                    if (this.showTension) {
                        this.TensionAccentReset();
                    }
                }

                // If the user wants an input transition, but the durations of both touched and untouched states are zero...
                if (this.inputTransition && (this.transitionTouchedDuration <= 0 && this.transitionUntouchedDuration <= 0)) {
                    // Then just apply the alpha.
                    if (this.useFade) {
                        this.joystickGroup.alpha = this.fadeUntouched;
                    }

                    // And reset the scale back to one.
                    if (this.useScale) {
                        this.joystickBase.localScale = new pc.Vec3( 1, 1, 1 );
                    }
                }

                // If the user is wanting to use the TouchAndRelease tap count...
                if (this.tapCountOption === UltimateJoystick.TapCountOption.TouchRelease) {
                    // If the tapTime is still above zero, then start the delay function.
                    if (this.currentTapTime > 0) {
                        this.StartCoroutine$2("TapCountDelay");
                    }

                    // Reset the current tap time to zero.
                    this.currentTapTime = 0;
                }

                // Update the position values.
                this.UpdatePositionValues();

                // Notify any subscribers that the OnPointerUp function has been called.
                if (!Bridge.staticEquals(this.OnPointerUpCallback, null)) {
                    this.OnPointerUpCallback();
                }
            },
            /*UltimateJoystick.OnPointerUp end.*/

            /*UltimateJoystick.ProcessInput start.*/
            /**
             * Processes the input provided and moves the joystick accordingly.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @param   {UnityEngine.Vector2}    inputPosition    The current position of the input.
             * @return  {void}
             */
            ProcessInput: function (inputPosition) {
                // Create a new Vector2 to equal the vector from the current touch to the center of joystick.
                var tempVector = inputPosition.$clone().sub( this.joystickCenter );

                // If the user wants only one axis, then zero out the opposite value.
                if (this.axis === UltimateJoystick.Axis.X) {
                    tempVector.y = 0;
                } else {
                    if (this.axis === UltimateJoystick.Axis.Y) {
                        tempVector.x = 0;
                    }
                }

                // If the user wants a circular boundary for the joystick, then clamp the magnitude by the radius.
                if (this.boundary === UltimateJoystick.Boundary.Circular) {
                    tempVector = pc.Vec2.lengthClamp( tempVector, this.radius * this.joystickBase.localScale.x );
                } else {
                    tempVector.x = Math.max(-this.radius * this.joystickBase.localScale.x, Math.min(tempVector.x, this.radius * this.joystickBase.localScale.x));
                    tempVector.y = Math.max(-this.radius * this.joystickBase.localScale.x, Math.min(tempVector.y, this.radius * this.joystickBase.localScale.x));
                }

                // Apply the tempVector to the joystick's position.
                this.joystick.localPosition = UnityEngine.Vector3.FromVector2((tempVector.$clone().scale( 1.0 / ( this.joystickBase.localScale.x ) )).scale( 1.0 / ( this.ParentCanvas.scaleFactor ) ));

                // If the user wants to drag the joystick along with the touch...
                if (this.extendRadius) {
                    // Store the position of the current touch.
                    var currentTouchPosition = UnityEngine.Vector3.FromVector2(inputPosition.$clone());

                    // If the user is using any axis option, then align the current touch position.
                    if (this.axis !== UltimateJoystick.Axis.Both) {
                        if (this.axis === UltimateJoystick.Axis.X) {
                            currentTouchPosition.y = this.joystickCenter.y;
                        } else {
                            currentTouchPosition.x = this.joystickCenter.x;
                        }
                    }
                    // Then find the distance that the touch is from the center of the joystick.
                    var touchDistance = pc.Vec3.distance( UnityEngine.Vector3.FromVector2(this.joystickCenter), currentTouchPosition );

                    // If the touchDistance is greater than the set radius...
                    if (touchDistance >= this.radius) {
                        // Figure out the current position of the joystick.
                        var joystickPosition = UnityEngine.Vector2.FromVector3(this.joystick.localPosition.$clone().scale( 1.0 / ( this.radius ) ));

                        // Move the joystickBase in the direction that the joystick is, multiplied by the difference in distance of the max radius.
                        this.joystickBase.localPosition = this.joystickBase.localPosition.$clone().add( new pc.Vec3( joystickPosition.x, joystickPosition.y, 0 ).clone().scale( (touchDistance - this.radius) ) );

                        // Reconfigure the joystick center since the joystick has now moved it's position.
                        this.UpdateJoystickCenter();
                    }
                }

                // Update the position values since the joystick has been updated.
                this.UpdatePositionValues();

                // If the user has showTension enabled, then display the Tension.
                if (this.showTension) {
                    this.TensionAccentDisplay();
                }
            },
            /*UltimateJoystick.ProcessInput end.*/

            /*UltimateJoystick.OnTransformParentChanged start.*/
            /**
             * This function is called by Unity when the parent of this transform changes.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            OnTransformParentChanged: function () {
                this.UpdateParentCanvas();
            },
            /*UltimateJoystick.OnTransformParentChanged end.*/

            /*UltimateJoystick.OnApplicationFocus start.*/
            OnApplicationFocus: function (focus) {
                if (!UnityEngine.Application.isPlaying || !this.joystickState || !focus) {
                    return;
                }

                this.ResetJoystick();
            },
            /*UltimateJoystick.OnApplicationFocus end.*/

            /*UltimateJoystick.UpdateParentCanvas start.*/
            /**
             * Updates the parent canvas if it has changed.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            UpdateParentCanvas: function () {
                // Store the parent of this object.
                var parent = this.transform.parent;

                // If the parent is null, then just return.
                if (UnityEngine.Component.op_Equality(parent, null)) {
                    return;
                }

                // While the parent is assigned...
                while (UnityEngine.Component.op_Inequality(parent, null)) {
                    // If the parent object has a Canvas component, then assign the ParentCanvas and transform.
                    if (UnityEngine.Object.op_Implicit(parent.transform.GetComponent(UnityEngine.Canvas))) {
                        this.ParentCanvas = parent.transform.GetComponent(UnityEngine.Canvas);
                        this.canvasRectTrans = this.ParentCanvas.GetComponent(UnityEngine.RectTransform);
                        return;
                    }

                    // If the parent does not have a canvas, then store it's parent to loop again.
                    parent = parent.transform.parent;
                }
            },
            /*UltimateJoystick.UpdateParentCanvas end.*/

            /*UltimateJoystick.UpdateJoystickPositioning start.*/
            /**
             * This function updates the joystick's position on the screen.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            UpdateJoystickPositioning: function () {
                // If the parent canvas is null, then try to get the parent canvas component.
                if (UnityEngine.Component.op_Equality(this.ParentCanvas, null)) {
                    this.UpdateParentCanvas();
                }

                // If it is still null, then log a error and return.
                if (UnityEngine.Component.op_Equality(this.ParentCanvas, null)) {
                    UnityEngine.Debug.LogError$2("Ultimate Joystick\nThere is no parent canvas object. Please make sure that the Ultimate Joystick is placed within a canvas.");
                    return;
                }

                // If any of the needed components are left unassigned, then inform the user and return.
                if (UnityEngine.Component.op_Equality(this.joystickBase, null)) {
                    if (UnityEngine.Application.isPlaying) {
                        UnityEngine.Debug.LogError$2("Ultimate Joystick\nThere are some needed components that are not currently assigned. Please check to make sure that all of the needed components are assigned.");
                    }

                    return;
                }

                // Set the current reference size for scaling.
                var referenceSize = this.scalingAxis === UltimateJoystick.ScalingAxis.Height ? this.canvasRectTrans.sizeDelta.y : this.canvasRectTrans.sizeDelta.x;

                // Configure the target size for the joystick graphic.
                var textureSize = referenceSize * (this.joystickSize / 10);

                // If baseTrans is null, store this object's RectTrans so that it can be positioned.
                if (UnityEngine.Component.op_Equality(this.baseTrans, null)) {
                    this.baseTrans = this.GetComponent(UnityEngine.RectTransform);
                }

                // Force the anchors and pivot so the joystick will function correctly. This is also needed here for older versions of the Ultimate Joystick that didn't use these rect transform settings.
                this.baseTrans.anchorMin = pc.Vec2.ZERO.clone();
                this.baseTrans.anchorMax = pc.Vec2.ZERO.clone();
                this.baseTrans.pivot = new pc.Vec2( 0.5, 0.5 );
                this.baseTrans.localScale = new pc.Vec3( 1, 1, 1 );

                // Set the anchors of the joystick base. It is important to have the anchors centered for calculations.
                this.joystickBase.anchorMin = new pc.Vec2( 0.5, 0.5 );
                this.joystickBase.anchorMax = new pc.Vec2( 0.5, 0.5 );
                this.joystickBase.pivot = new pc.Vec2( 0.5, 0.5 );

                // Configure the position that the user wants the joystick to be located.
                var joystickPosition = new pc.Vec2( this.canvasRectTrans.sizeDelta.x * (this.positionHorizontal / 100) - (textureSize * (this.positionHorizontal / 100)) + (textureSize / 2), this.canvasRectTrans.sizeDelta.y * (this.positionVertical / 100) - (textureSize * (this.positionVertical / 100)) + (textureSize / 2) ).sub( (this.canvasRectTrans.sizeDelta.$clone().scale( 1.0 / ( 2 ) )) );
                //Vector2 bottomLeft = new Vector2( -canvasRectTrans.sizeDelta.x / 2 + ( textureSize / 2 ), -canvasRectTrans.sizeDelta.y / 2 + ( textureSize / 2 ) );
                //Vector2 joystickPosition = bottomLeft + new Vector2( canvasRectTrans.sizeDelta.x * ( positionHorizontal / 100 ), canvasRectTrans.sizeDelta.y * ( positionVertical / 100 ) );

                if (this.anchor === UltimateJoystick.Anchor.Right) {
                    joystickPosition.x = -joystickPosition.x;
                }

                // If the user wants a custom touch size...
                if (this.customActivationRange) {
                    // Apply the size of the custom activation range.
                    this.baseTrans.sizeDelta = new pc.Vec2( this.canvasRectTrans.sizeDelta.x * (this.activationWidth / 100), this.canvasRectTrans.sizeDelta.y * (this.activationHeight / 100) );

                    // Apply the new position minus half the canvas position size.
                    this.baseTrans.localPosition = UnityEngine.Vector3.FromVector2(new pc.Vec2( this.canvasRectTrans.sizeDelta.x * (this.activationPositionHorizontal / 100) - (this.baseTrans.sizeDelta.x * (this.activationPositionHorizontal / 100)) + (this.baseTrans.sizeDelta.x / 2), this.canvasRectTrans.sizeDelta.y * (this.activationPositionVertical / 100) - (this.baseTrans.sizeDelta.y * (this.activationPositionVertical / 100)) + (this.baseTrans.sizeDelta.y / 2) ).sub( (this.canvasRectTrans.sizeDelta.$clone().scale( 1.0 / ( 2 ) )) ));

                    // Apply the size and position to the joystickBase.
                    this.joystickBase.sizeDelta = new pc.Vec2( textureSize, textureSize );
                    this.joystickBase.localPosition = this.baseTrans.transform.InverseTransformPoint(this.ParentCanvas.transform.TransformPoint$1(UnityEngine.Vector3.FromVector2(joystickPosition)));
                } else {
                    // Apply the joystick size multiplied by the activation range.
                    this.baseTrans.sizeDelta = new pc.Vec2( textureSize, textureSize ).scale( this.activationRange );

                    // Apply the imagePosition.
                    this.baseTrans.localPosition = UnityEngine.Vector3.FromVector2(joystickPosition.$clone());

                    // Apply the size and position to the joystickBase.
                    this.joystickBase.sizeDelta = new pc.Vec2( textureSize, textureSize );
                    this.joystickBase.localPosition = pc.Vec3.ZERO.clone();
                }

                // If the options dictate that the default position needs to be stored, then store it here.
                if (this.dynamicPositioning || this.disableVisuals || this.extendRadius) {
                    this.defaultPos = UnityEngine.Vector2.FromVector3(this.joystickBase.localPosition.$clone());
                }

                // Configure the size of the Ultimate Joystick's radius.
                this.radius = (this.joystickBase.sizeDelta.x * this.ParentCanvas.scaleFactor) * (this.radiusModifier / 10);

                // Update the joystick center so that reference positions can be configured correctly.
                this.UpdateJoystickCenter();

                // If the user wants to transition, and the joystickGroup is unassigned, find the CanvasGroup.
                if (this.inputTransition && UnityEngine.MonoBehaviour.op_Equality(this.joystickGroup, null)) {
                    this.joystickGroup = this.GetComponent(UnityEngine.CanvasGroup);
                    if (UnityEngine.MonoBehaviour.op_Equality(this.joystickGroup, null)) {
                        this.joystickGroup = this.gameObject.AddComponent(UnityEngine.CanvasGroup);
                    }
                }

                // Configure the actual size delta and position of the base trans regardless of the canvas scaler setting.
                var baseSizeDelta = this.baseTrans.sizeDelta.$clone().scale( this.ParentCanvas.scaleFactor );
                var baseLocalPosition = UnityEngine.Vector2.FromVector3(this.baseTrans.localPosition.$clone().clone().scale( this.ParentCanvas.scaleFactor ));

                // Calculate the rect of the base trans.
                this.joystickRect = new UnityEngine.Rect.$ctor3(new pc.Vec2( baseLocalPosition.x - (baseSizeDelta.x / 2), baseLocalPosition.y - (baseSizeDelta.y / 2) ).add( ((this.canvasRectTrans.sizeDelta.$clone().scale( this.ParentCanvas.scaleFactor )).scale( 1.0 / ( 2 ) )) ), baseSizeDelta.$clone());
            },
            /*UltimateJoystick.UpdateJoystickPositioning end.*/

            /*UltimateJoystick.UpdateJoystickCenter start.*/
            /**
             * Updates the joystick center value.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            UpdateJoystickCenter: function () {
                this.joystickCenter = (UnityEngine.Vector2.FromVector3(this.ParentCanvas.transform.InverseTransformPoint(this.joystickBase.position)).scale( this.ParentCanvas.scaleFactor )).add( ((this.canvasRectTrans.sizeDelta.$clone().scale( this.ParentCanvas.scaleFactor )).scale( 1.0 / ( 2 ) )) );
            },
            /*UltimateJoystick.UpdateJoystickCenter end.*/

            /*UltimateJoystick.TensionAccentDisplay start.*/
            /**
             * This function is called only when showTension is true, and only when the joystick is moving.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            TensionAccentDisplay: function () {
                // If the tension accent images are null, then inform the user and return.
                if (this.TensionAccents.Count === 0) {
                    UnityEngine.Debug.LogError$2("Ultimate Joystick\nThere are no tension accent images assigned. This could be happening for several reasons, but all of them should be fixable in the Ultimate Joystick inspector.");
                    return;
                }

                // If the user wants to display directional tension...
                if (this.tensionType === UltimateJoystick.TensionType.Directional) {
                    // Calculate the joystick axis values.
                    var joystickAxis = UnityEngine.Vector2.FromVector3((this.joystick.localPosition.$clone().clone().scale( this.ParentCanvas.scaleFactor )).scale( 1.0 / ( this.radius ) ));

                    // If the joystick is to the right...
                    if (joystickAxis.x > 0) {
                        // Then lerp the color according to tension's X position.
                        if (UnityEngine.MonoBehaviour.op_Inequality(this.TensionAccents.getItem(3), null)) {
                            this.TensionAccents.getItem(3).color = pc.Color.lerp( this.tensionColorNone, this.tensionColorFull, joystickAxis.x <= this.tensionDeadZone ? 0 : (joystickAxis.x - this.tensionDeadZone) / (1.0 - this.tensionDeadZone) );
                        }

                        // If the opposite tension is not tensionColorNone, the make it so.
                        if (UnityEngine.MonoBehaviour.op_Inequality(this.TensionAccents.getItem(1), null) && !pc.Color.equals( this.TensionAccents.getItem(1).color, this.tensionColorNone )) {
                            this.TensionAccents.getItem(1).color = this.tensionColorNone.$clone();
                        }
                    } else {
                        // Repeat above steps...
                        if (UnityEngine.MonoBehaviour.op_Inequality(this.TensionAccents.getItem(1), null)) {
                            this.TensionAccents.getItem(1).color = pc.Color.lerp( this.tensionColorNone, this.tensionColorFull, Math.abs(joystickAxis.x) <= this.tensionDeadZone ? 0 : (Math.abs(joystickAxis.x) - this.tensionDeadZone) / (1.0 - this.tensionDeadZone) );
                        }
                        if (UnityEngine.MonoBehaviour.op_Inequality(this.TensionAccents.getItem(3), null) && !pc.Color.equals( this.TensionAccents.getItem(3).color, this.tensionColorNone )) {
                            this.TensionAccents.getItem(3).color = this.tensionColorNone.$clone();
                        }
                    }

                    // If the joystick is up...
                    if (joystickAxis.y > 0) {
                        // Then lerp the color according to tension's Y position.
                        if (UnityEngine.MonoBehaviour.op_Inequality(this.TensionAccents.getItem(0), null)) {
                            this.TensionAccents.getItem(0).color = pc.Color.lerp( this.tensionColorNone, this.tensionColorFull, joystickAxis.y <= this.tensionDeadZone ? 0 : (joystickAxis.y - this.tensionDeadZone) / (1.0 - this.tensionDeadZone) );
                        }

                        // If the opposite tension is not tensionColorNone, the make it so.
                        if (UnityEngine.MonoBehaviour.op_Inequality(this.TensionAccents.getItem(2), null) && !pc.Color.equals( this.TensionAccents.getItem(2).color, this.tensionColorNone )) {
                            this.TensionAccents.getItem(2).color = this.tensionColorNone.$clone();
                        }
                    } else {
                        // Repeat above steps...
                        if (UnityEngine.MonoBehaviour.op_Inequality(this.TensionAccents.getItem(2), null)) {
                            this.TensionAccents.getItem(2).color = pc.Color.lerp( this.tensionColorNone, this.tensionColorFull, Math.abs(joystickAxis.y) <= this.tensionDeadZone ? 0 : (Math.abs(joystickAxis.y) - this.tensionDeadZone) / (1.0 - this.tensionDeadZone) );
                        }
                        if (UnityEngine.MonoBehaviour.op_Inequality(this.TensionAccents.getItem(0), null) && !pc.Color.equals( this.TensionAccents.getItem(0).color, this.tensionColorNone )) {
                            this.TensionAccents.getItem(0).color = this.tensionColorNone.$clone();
                        }
                    }
                } else {
                    // If the first index tension is null, then inform the user and return to avoid errors.
                    if (UnityEngine.MonoBehaviour.op_Equality(this.TensionAccents.getItem(0), null)) {
                        UnityEngine.Debug.LogError$2("Ultimate Joystick\nThere are no tension accent images assigned. This could be happening for several reasons, but all of them should be fixable in the Ultimate Joystick inspector.");
                        return;
                    }

                    // Store the distance for calculations.
                    var distance = this.GetDistance();

                    // Lerp the color according to the distance of the joystick from center.
                    this.TensionAccents.getItem(0).color = pc.Color.lerp( this.tensionColorNone, this.tensionColorFull, distance <= this.tensionDeadZone ? 0 : (distance - this.tensionDeadZone) / (1.0 - this.tensionDeadZone) );

                    // Calculate the joystick axis values.
                    var joystickAxis1 = UnityEngine.Vector2.FromVector3(this.joystick.localPosition.$clone().scale( 1.0 / ( this.radius ) ));

                    // Rotate the tension transform to aim at the direction that the joystick is pointing.
                    this.TensionAccents.getItem(0).transform.localRotation = new pc.Quat().setFromEulerAngles_Unity( 0, 0, (Math.atan2(joystickAxis1.y, joystickAxis1.x) * UnityEngine.Mathf.Rad2Deg) + this.rotationOffset - 90 );
                }
            },
            /*UltimateJoystick.TensionAccentDisplay end.*/

            /*UltimateJoystick.TensionAccentReset start.*/
            /**
             * This function resets the tension image's colors back to default.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            TensionAccentReset: function () {
                // Loop through each tension accent.
                for (var i = 0; i < this.TensionAccents.Count; i = (i + 1) | 0) {
                    // If the tension accent is unassigned, then skip this index.
                    if (UnityEngine.MonoBehaviour.op_Equality(this.TensionAccents.getItem(i), null)) {
                        continue;
                    }

                    // Reset the color of this tension image back to no tension.
                    this.TensionAccents.getItem(i).color = this.tensionColorNone.$clone();
                }

                // If the joystick is using a free tension, then reset the tension rotation back to center.
                if (this.tensionType === UltimateJoystick.TensionType.Free && this.TensionAccents.Count > 0 && UnityEngine.MonoBehaviour.op_Inequality(this.TensionAccents.getItem(0), null)) {
                    this.TensionAccents.getItem(0).transform.localRotation = pc.Quat.IDENTITY.clone();
                }
            },
            /*UltimateJoystick.TensionAccentReset end.*/

            /*UltimateJoystick.GravityHandler start.*/
            /**
             * This function is for returning the joystick back to center for a set amount of time.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {System.Collections.IEnumerator}
             */
            GravityHandler: function () {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    speed,
                    startJoyPos,
                    t,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    // Set gravityActive to true so other functions know it is running.
                                        this.gravityActive = true;

                                        // Calculate the speed according to the distance left from center.
                                        speed = 1.0 / (this.GetDistance() / this.gravity);

                                        // Store the position of where the joystick is currently.
                                        startJoyPos = this.joystick.localPosition.$clone();

                                        // Loop for the time it will take for the joystick to return to center.
                                        t = 0.0;
                                        $step = 1;
                                        continue;
                                }
                                case 1: {
                                    if ( t < 1.0 && this.gravityActive ) {
                                            $step = 2;
                                            continue;
                                        }
                                    $step = 5;
                                    continue;
                                }
                                case 2: {
                                    // Lerp the joystick's position from where this coroutine started to the center.
                                        this.joystick.localPosition = new pc.Vec3().lerp( startJoyPos, pc.Vec3.ZERO.clone(), t );

                                        // If the user a direction display option enabled, then display the direction as the joystick moves.
                                        if (this.showTension) {
                                            this.TensionAccentDisplay();
                                        }

                                        // Update the position values since the joystick has moved.
                                        this.UpdatePositionValues();

                                        $enumerator.current = null;
                                        $step = 3;
                                        return true;
                                }
                                case 3: {
                                    $step = 4;
                                    continue;
                                }
                                case 4: {
                                    t += UnityEngine.Time.deltaTime * speed;
                                    $step = 1;
                                    continue;
                                }
                                case 5: {
                                    // If the gravityActive controller is still true, then the user has not interrupted the joystick returning to center.
                                        if (this.gravityActive) {
                                            // Finalize the joystick's position.
                                            this.joystick.localPosition = pc.Vec3.ZERO.clone();

                                            // Here at the end, reset the direction display.
                                            if (this.showTension) {
                                                this.TensionAccentReset();
                                            }

                                            // And update the position values since the joystick has reached the center.
                                            this.UpdatePositionValues();
                                        }

                                        // Set gravityActive to false so that other functions can know it is finished.
                                        this.gravityActive = false;

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*UltimateJoystick.GravityHandler end.*/

            /*UltimateJoystick.InputTransition start.*/
            /**
             * This coroutine will handle the input transitions over time according to the users options.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {System.Collections.IEnumerator}
             */
            InputTransition: function () {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    currentAlpha,
                    currentScale,
                    transition,
                    transition1,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    // Store the current values for the alpha and scale of the joystick.
                                        currentAlpha = this.joystickGroup.alpha;
                                        currentScale = this.joystickBase.localScale.x;

                                        // If the scaleInSpeed is NaN....
                                        if ((Math.abs(this.transitionTouchedSpeed) === Number.POSITIVE_INFINITY)) {
                                            $step = 1;
                                            continue;
                                        } else  {
                                            $step = 2;
                                            continue;
                                        }
                                }
                                case 1: {
                                    // Set the alpha to the touched value.
                                        if (this.useFade) {
                                            this.joystickGroup.alpha = this.fadeTouched;
                                        }

                                        // Set the scale to the touched value.
                                        if (this.useScale) {
                                            this.joystickBase.localScale = new pc.Vec3( 1, 1, 1 ).clone().scale( this.scaleTouched );
                                        }
                                    $step = 8;
                                    continue;
                                }
                                case 2: {
                                    // This for loop will continue for the transition duration.
                                        transition = 0.0;
                                        $step = 3;
                                        continue;
                                }
                                case 3: {
                                    if ( transition < 1.0 && this.joystickState ) {
                                            $step = 4;
                                            continue;
                                        }
                                    $step = 7;
                                    continue;
                                }
                                case 4: {
                                    // Lerp the alpha of the canvas group.
                                        if (this.useFade) {
                                            this.joystickGroup.alpha = pc.math.lerp(currentAlpha, this.fadeTouched, transition);
                                        }

                                        // Lerp the scale of the joystick.
                                        if (this.useScale) {
                                            this.joystickBase.localScale = new pc.Vec3( 1, 1, 1 ).clone().scale( pc.math.lerp(currentScale, this.scaleTouched, transition) );
                                        }

                                        $enumerator.current = null;
                                        $step = 5;
                                        return true;
                                }
                                case 5: {
                                    $step = 6;
                                    continue;
                                }
                                case 6: {
                                    transition += UnityEngine.Time.deltaTime * this.transitionTouchedSpeed;
                                    $step = 3;
                                    continue;
                                }
                                case 7: {
                                    // If the joystick is still being interacted with, then finalize the values since the loop above has ended.
                                        if (this.joystickState) {
                                            if (this.useFade) {
                                                this.joystickGroup.alpha = this.fadeTouched;
                                            }

                                            if (this.useScale) {
                                                this.joystickBase.localScale = new pc.Vec3( 1, 1, 1 ).clone().scale( this.scaleTouched );
                                            }
                                        }
                                    $step = 8;
                                    continue;
                                }
                                case 8: {
                                    // While loop for while joystickState is true
                                    $step = 9;
                                    continue;
                                }
                                case 9: {
                                    if ( this.joystickState ) {
                                            $step = 10;
                                            continue;
                                        } 
                                        $step = 12;
                                        continue;
                                }
                                case 10: {
                                    $enumerator.current = null;
                                        $step = 11;
                                        return true;
                                }
                                case 11: {
                                    
                                        $step = 9;
                                        continue;
                                }
                                case 12: {
                                    // Set the current values.
                                        currentAlpha = this.joystickGroup.alpha;
                                        currentScale = this.joystickBase.localScale.x;

                                        // If the scaleOutSpeed value is NaN, then apply the desired alpha and scale.
                                        if ((Math.abs(this.transitionUntouchedSpeed) === Number.POSITIVE_INFINITY)) {
                                            $step = 13;
                                            continue;
                                        } else  {
                                            $step = 14;
                                            continue;
                                        }
                                }
                                case 13: {
                                    if (this.useFade) {
                                            this.joystickGroup.alpha = this.fadeUntouched;
                                        }

                                        if (this.useScale) {
                                            this.joystickBase.localScale = new pc.Vec3( 1, 1, 1 );
                                        }
                                    $step = 20;
                                    continue;
                                }
                                case 14: {
                                    transition1 = 0.0;
                                        $step = 15;
                                        continue;
                                }
                                case 15: {
                                    if ( transition1 < 1.0 && !this.joystickState ) {
                                            $step = 16;
                                            continue;
                                        }
                                    $step = 19;
                                    continue;
                                }
                                case 16: {
                                    if (this.useFade) {
                                            this.joystickGroup.alpha = pc.math.lerp(currentAlpha, this.fadeUntouched, transition1);
                                        }

                                        if (this.useScale) {
                                            this.joystickBase.localScale = new pc.Vec3( 1, 1, 1 ).clone().scale( pc.math.lerp(currentScale, 1.0, transition1) );
                                        }
                                        $enumerator.current = null;
                                        $step = 17;
                                        return true;
                                }
                                case 17: {
                                    $step = 18;
                                    continue;
                                }
                                case 18: {
                                    transition1 += UnityEngine.Time.deltaTime * this.transitionUntouchedSpeed;
                                    $step = 15;
                                    continue;
                                }
                                case 19: {
                                    // If the joystick is still not being interacted with, then finalize the alpha and scale since the loop above finished.
                                        if (!this.joystickState) {
                                            if (this.useFade) {
                                                this.joystickGroup.alpha = this.fadeUntouched;
                                            }

                                            if (this.useScale) {
                                                this.joystickBase.localScale = new pc.Vec3( 1, 1, 1 );
                                            }
                                        }
                                    $step = 20;
                                    continue;
                                }
                                case 20: {

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*UltimateJoystick.InputTransition end.*/

            /*UltimateJoystick.TapCountdown start.*/
            /**
             * This function counts down the tap count duration. The current tap time that is being modified is check within the input functions.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {System.Collections.IEnumerator}
             */
            TapCountdown: function () {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    // Set the current tap time to the max.
                                        this.currentTapTime = this.tapCountDuration;
                                    $step = 1;
                                    continue;
                                }
                                case 1: {
                                    if ( this.currentTapTime > 0 ) {
                                            $step = 2;
                                            continue;
                                        } 
                                        $step = 4;
                                        continue;
                                }
                                case 2: {
                                    // Reduce the current time.
                                        this.currentTapTime -= UnityEngine.Time.deltaTime;
                                        $enumerator.current = null;
                                        $step = 3;
                                        return true;
                                }
                                case 3: {
                                    
                                        $step = 1;
                                        continue;
                                }
                                case 4: {

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*UltimateJoystick.TapCountdown end.*/

            /*UltimateJoystick.TapCountDelay start.*/
            /**
             * This function delays for one frame so that it can be correctly referenced as soon as it is achieved.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {System.Collections.IEnumerator}
             */
            TapCountDelay: function () {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    this.tapCountAchieved = true;
                                        $enumerator.current = new UnityEngine.WaitForEndOfFrame();
                                        $step = 1;
                                        return true;
                                }
                                case 1: {
                                    this.tapCountAchieved = false;

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*UltimateJoystick.TapCountDelay end.*/

            /*UltimateJoystick.UpdatePositionValues start.*/
            /**
             * This function updates the position values of the joystick so that they can be referenced.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            UpdatePositionValues: function () {
                // Store the relative position of the joystick and divide the Vector by the radius of the joystick. This will normalize the values.
                var joystickPosition = UnityEngine.Vector2.FromVector3((this.joystick.localPosition.$clone().clone().scale( this.ParentCanvas.scaleFactor )).scale( 1.0 / ( this.radius ) ));

                // If the distance of the joystick from center is less that the dead zone set by the user...
                if (this.GetDistance() <= this.deadZone) {
                    // Then zero out the axis values.
                    joystickPosition.x = 0.0;
                    joystickPosition.y = 0.0;
                }

                // Finally, set the horizontal and vertical axis values for reference.
                this.HorizontalAxis = joystickPosition.x;
                this.VerticalAxis = joystickPosition.y;

            },
            /*UltimateJoystick.UpdatePositionValues end.*/

            /*UltimateJoystick.ResetJoystick start.*/
            /**
             * Resets the joystick position and input information and stops any coroutines that might have been running.
             *
             * @instance
             * @private
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            ResetJoystick: function () {
                // Reset all of the controller variables.
                this.gravityActive = false;
                this.joystickState = false;

                // Stop the gravity coroutine.
                this.StopCoroutine$1("GravityHandler");

                // If dynamicPositioning, disableVisuals, or extendRadius are enabled...
                if (this.dynamicPositioning || this.disableVisuals || this.extendRadius) {
                    // The joystickBase needs to be reset back to the default position.
                    this.joystickBase.localPosition = UnityEngine.Vector3.FromVector2(this.defaultPos.$clone());

                    // Reset the joystick center since the touch has been released.
                    this.UpdateJoystickCenter();
                }

                // Reset the joystick's position back to center.
                this.joystick.localPosition = pc.Vec3.ZERO.clone();

                // Update the position values.
                this.UpdatePositionValues();

                // If the user has showTension enabled, then reset the tension.
                if (this.showTension) {
                    this.TensionAccentReset();
                }
            },
            /*UltimateJoystick.ResetJoystick end.*/

            /*UltimateJoystick.UpdatePositioning start.*/
            /**
             * Resets the joystick and updates the size and placement of the Ultimate Joystick. Useful for screen rotations, changing of screen size, or changing of size and placement options.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            UpdatePositioning: function () {
                // If the game is running, then reset the joystick.
                if (UnityEngine.Application.isPlaying) {
                    this.ResetJoystick();
                }

                // Update the positioning.
                this.UpdateJoystickPositioning();

                // Notify any subscribers that the UpdatePositioning function has been called.
                if (!Bridge.staticEquals(this.OnUpdatePositioning, null)) {
                    this.OnUpdatePositioning();
                }
            },
            /*UltimateJoystick.UpdatePositioning end.*/

            /*UltimateJoystick.GetHorizontalAxis start.*/
            /**
             * Returns a float value between -1 and 1 representing the horizontal value of the Ultimate Joystick.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {number}
             */
            GetHorizontalAxis: function () {
                return this.HorizontalAxis;
            },
            /*UltimateJoystick.GetHorizontalAxis end.*/

            /*UltimateJoystick.GetVerticalAxis start.*/
            /**
             * Returns a float value between -1 and 1 representing the vertical value of the Ultimate Joystick.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {number}
             */
            GetVerticalAxis: function () {
                return this.VerticalAxis;
            },
            /*UltimateJoystick.GetVerticalAxis end.*/

            /*UltimateJoystick.GetHorizontalAxisRaw start.*/
            /**
             * Returns a value of -1, 0 or 1 representing the raw horizontal value of the Ultimate Joystick.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {number}
             */
            GetHorizontalAxisRaw: function () {
                var temp = this.HorizontalAxis;

                if (Math.abs(temp) <= this.deadZone) {
                    temp = 0.0;
                } else {
                    temp = temp < 0.0 ? -1.0 : 1.0;
                }

                return temp;
            },
            /*UltimateJoystick.GetHorizontalAxisRaw end.*/

            /*UltimateJoystick.GetVerticalAxisRaw start.*/
            /**
             * Returns a value of -1, 0 or 1 representing the raw vertical value of the Ultimate Joystick.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {number}
             */
            GetVerticalAxisRaw: function () {
                var temp = this.VerticalAxis;
                if (Math.abs(temp) <= this.deadZone) {
                    temp = 0.0;
                } else {
                    temp = temp < 0.0 ? -1.0 : 1.0;
                }

                return temp;
            },
            /*UltimateJoystick.GetVerticalAxisRaw end.*/

            /*UltimateJoystick.GetDistance start.*/
            /**
             * Returns a float value between 0 and 1 representing the distance of the joystick from the base.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {number}
             */
            GetDistance: function () {
                return pc.Vec3.distance( this.joystick.localPosition.$clone().clone().scale( this.ParentCanvas.scaleFactor ), pc.Vec3.ZERO.clone() ) / this.radius;
            },
            /*UltimateJoystick.GetDistance end.*/

            /*UltimateJoystick.UpdateHighlightColor start.*/
            /**
             * Updates the color of the highlights attached to the Ultimate Joystick with the targeted color.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @param   {UnityEngine.Color}    targetColor    New highlight color.
             * @return  {void}
             */
            UpdateHighlightColor: function (targetColor) {
                // If the user doesn't want to show highlight, then return.
                if (!this.showHighlight) {
                    return;
                }

                // Assigned the new color.
                this.highlightColor = targetColor.$clone();

                // if the base highlight is assigned then apply the color.
                if (UnityEngine.MonoBehaviour.op_Inequality(this.highlightBase, null)) {
                    this.highlightBase.color = this.highlightColor.$clone();
                }

                // If the joystick highlight image is assigned, apply the highlight color.
                if (UnityEngine.MonoBehaviour.op_Inequality(this.highlightJoystick, null)) {
                    this.highlightJoystick.color = this.highlightColor.$clone();
                }
            },
            /*UltimateJoystick.UpdateHighlightColor end.*/

            /*UltimateJoystick.UpdateTensionColors start.*/
            /**
             * Updates the colors of the tension accents attached to the Ultimate Joystick with the targeted colors.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @param   {UnityEngine.Color}    targetTensionNone    New idle tension color.
             * @param   {UnityEngine.Color}    targetTensionFull    New full tension color.
             * @return  {void}
             */
            UpdateTensionColors: function (targetTensionNone, targetTensionFull) {
                // If the user doesn't want to show tension, then just return.
                if (!this.showTension) {
                    return;
                }

                // Assign the tension colors.
                this.tensionColorNone = targetTensionNone.$clone();
                this.tensionColorFull = targetTensionFull.$clone();
            },
            /*UltimateJoystick.UpdateTensionColors end.*/

            /*UltimateJoystick.GetJoystickState start.*/
            /**
             * Returns the current state of the Ultimate Joystick. This function will return true when the joystick is being interacted with, and false when not.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {boolean}
             */
            GetJoystickState: function () {
                return this.joystickState;
            },
            /*UltimateJoystick.GetJoystickState end.*/

            /*UltimateJoystick.GetTapCount start.*/
            /**
             * Returns the tap count to the Ultimate Joystick.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {boolean}
             */
            GetTapCount: function () {
                return this.tapCountAchieved;
            },
            /*UltimateJoystick.GetTapCount end.*/

            /*UltimateJoystick.DisableJoystick start.*/
            /**
             * Disables the Ultimate Joystick.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            DisableJoystick: function () {
                // Set the states to false.
                this.joystickState = false;

                // If the joystick center has been changed, then reset it.
                if (this.dynamicPositioning || this.disableVisuals || this.extendRadius) {
                    this.joystickBase.localPosition = UnityEngine.Vector3.FromVector2(this.defaultPos.$clone());
                    this.UpdateJoystickCenter();
                }

                // Reset the position of the joystick.
                this.joystick.localPosition = pc.Vec3.ZERO.clone();

                // Update the joystick position values since the joystick has been reset.
                this.UpdatePositionValues();

                // If the user is displaying tension accents, then reset them here.
                if (this.showTension) {
                    this.TensionAccentReset();
                }

                // If the user wants to show a transition on the different input states...
                if (this.inputTransition) {
                    // If the user is displaying a fade, then reset to the untouched state.
                    if (this.useFade) {
                        this.joystickGroup.alpha = this.fadeUntouched;
                    }

                    // If the user is scaling the joystick, then reset the scale.
                    if (this.useScale) {
                        this.joystickBase.transform.localScale = new pc.Vec3( 1, 1, 1 );
                    }
                }

                // Disable the gameObject.
                this.gameObject.SetActive(false);
            },
            /*UltimateJoystick.DisableJoystick end.*/

            /*UltimateJoystick.EnableJoystick start.*/
            /**
             * Enables the Ultimate Joystick.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @return  {void}
             */
            EnableJoystick: function () {
                // Reset the joystick's position again.
                this.joystick.localPosition = pc.Vec3.ZERO.clone();

                // Enable the gameObject.
                this.gameObject.SetActive(true);
            },
            /*UltimateJoystick.EnableJoystick end.*/

            /*UltimateJoystick.InputInRange start.*/
            /**
             * Checks to see if the provided input is within range of the Ultimate Joystick.
             *
             * @instance
             * @public
             * @this UltimateJoystick
             * @memberof UltimateJoystick
             * @param   {UnityEngine.Vector2}    inputPosition    The input value to check.
             * @return  {boolean}
             */
            InputInRange: function (inputPosition) {
                // If the user wants a circular boundary but does not want a custom activation range...
                if (this.boundary === UltimateJoystick.Boundary.Circular && !this.customActivationRange) {
                    // distance = distance between the world position of the joystickBase cast to a local position of the ParentCanvas (* by scale factor) - half of the actual canvas size, and the input position.
                    var distance = UnityEngine.Vector2.FromVector3((this.ParentCanvas.transform.InverseTransformPoint(this.joystickBase.position).clone().scale( this.ParentCanvas.scaleFactor ))).add( ((this.canvasRectTrans.sizeDelta.$clone().scale( this.ParentCanvas.scaleFactor )).scale( 1.0 / ( 2 ) )) ).sub( inputPosition ).length();

                    // If the distance is out of range, then return false.
                    if (distance / (this.baseTrans.sizeDelta.x * this.ParentCanvas.scaleFactor) <= 0.5) {
                        return true;
                    }
                } else {
                    // If the joystickRect contains the input position, then return true.
                    if (this.joystickRect.Contains(inputPosition)) {
                        return true;
                    }
                }

                // Else none of the above is true, so return false.
                return false;
            },
            /*UltimateJoystick.InputInRange end.*/


        }
    });
    /*UltimateJoystick end.*/

    /*UltimateJoystick+Anchor start.*/
    Bridge.define("UltimateJoystick.Anchor", {
        $kind: 1006,
        statics: {
            fields: {
                Left: 0,
                Right: 1
            }
        }
    });
    /*UltimateJoystick+Anchor end.*/

    /*UltimateJoystick+Axis start.*/
    Bridge.define("UltimateJoystick.Axis", {
        $kind: 1006,
        statics: {
            fields: {
                Both: 0,
                X: 1,
                Y: 2
            }
        }
    });
    /*UltimateJoystick+Axis end.*/

    /*UltimateJoystick+Boundary start.*/
    Bridge.define("UltimateJoystick.Boundary", {
        $kind: 1006,
        statics: {
            fields: {
                Circular: 0,
                Square: 1
            }
        }
    });
    /*UltimateJoystick+Boundary end.*/

    /*UltimateJoystick+ScalingAxis start.*/
    Bridge.define("UltimateJoystick.ScalingAxis", {
        $kind: 1006,
        statics: {
            fields: {
                Width: 0,
                Height: 1
            }
        }
    });
    /*UltimateJoystick+ScalingAxis end.*/

    /*UltimateJoystick+TapCountOption start.*/
    Bridge.define("UltimateJoystick.TapCountOption", {
        $kind: 1006,
        statics: {
            fields: {
                NoCount: 0,
                Accumulate: 1,
                TouchRelease: 2
            }
        }
    });
    /*UltimateJoystick+TapCountOption end.*/

    /*UltimateJoystick+TensionType start.*/
    Bridge.define("UltimateJoystick.TensionType", {
        $kind: 1006,
        statics: {
            fields: {
                Directional: 0,
                Free: 1
            }
        }
    });
    /*UltimateJoystick+TensionType end.*/

    /*UltimateJoystickExample.Spaceship.AsteroidController start.*/
    Bridge.define("UltimateJoystickExample.Spaceship.AsteroidController", {
        inherits: [UnityEngine.MonoBehaviour],
        fields: {
            asteroidManager: null,
            myRigidbody: null,
            canDestroy: false,
            isDestroyed: false,
            isDebris: false
        },
        ctors: {
            init: function () {
                this.canDestroy = false;
                this.isDestroyed = false;
                this.isDebris = false;
            }
        },
        methods: {
            /*UltimateJoystickExample.Spaceship.AsteroidController.Setup start.*/
            Setup: function (force, torque) {
                // Assign the rigidbody component attached to this game object.
                this.myRigidbody = this.GetComponent(UnityEngine.Rigidbody);

                // Add the force and torque to the rigidbody.
                this.myRigidbody.AddForce$1(force);
                this.myRigidbody.AddTorque$1(torque);

                // Delay the time that this asteroid can be destroyed for being out of the screen.
                this.StartCoroutine$1(this.DelayInitialDestruction(this.isDebris === true ? 0.25 : 1.0));
            },
            /*UltimateJoystickExample.Spaceship.AsteroidController.Setup end.*/

            /*UltimateJoystickExample.Spaceship.AsteroidController.DelayInitialDestruction start.*/
            DelayInitialDestruction: function (delayTime) {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    // Wait for the designated time.
                                        $enumerator.current = new UnityEngine.WaitForSeconds(delayTime);
                                        $step = 1;
                                        return true;
                                }
                                case 1: {
                                    // Allow this asteroid to be destoryed.
                                        this.canDestroy = true;

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*UltimateJoystickExample.Spaceship.AsteroidController.DelayInitialDestruction end.*/

            /*UltimateJoystickExample.Spaceship.AsteroidController.Update start.*/
            Update: function () {
                // If the asteroid is out of the screen...
                if (Math.abs(this.transform.position.x) > UnityEngine.Camera.main.orthographicSize * UnityEngine.Camera.main.aspect * 1.3 || Math.abs(this.transform.position.z) > UnityEngine.Camera.main.orthographicSize * 1.3) {
                    // If this asteroid can be destoryed, then commence destruction!
                    if (this.canDestroy === true) {
                        UnityEngine.MonoBehaviour.Destroy(this.gameObject);
                    }
                }
            },
            /*UltimateJoystickExample.Spaceship.AsteroidController.Update end.*/

            /*UltimateJoystickExample.Spaceship.AsteroidController.OnCollisionEnter start.*/
            OnCollisionEnter: function (theCollision) {
                // If the collision was from a bullet...
                if (Bridge.referenceEquals(theCollision.gameObject.name, "Bullet")) {
                    // Destroy the bullet.
                    UnityEngine.MonoBehaviour.Destroy(theCollision.gameObject);

                    // Modify the score.
                    this.asteroidManager.ModifyScore(this.isDebris);

                    // If this object is not debris, then explode.
                    if (this.isDebris === false) {
                        this.Explode();
                    } else {
                        UnityEngine.MonoBehaviour.Destroy(this.gameObject);
                    }
                } else if (Bridge.referenceEquals(theCollision.gameObject.name, "Player")) {
                    // Spawn an explosion where the player is at.
                    this.asteroidManager.SpawnExplosion(theCollision.transform.position);

                    // Destroy the player.
                    UnityEngine.MonoBehaviour.Destroy(theCollision.gameObject);

                    // If this object is not debris, then explode.
                    if (this.isDebris === false) {
                        this.Explode();
                    } else {
                        UnityEngine.MonoBehaviour.Destroy(this.gameObject);
                    }

                    // Show the user the death screen.
                    this.asteroidManager.ShowDeathScreen();
                } else {
                    // If this object is not debris and it can be destroyed, then explode.
                    if (this.isDebris === false && this.canDestroy === true) {
                        this.Explode();
                    } else {
                        if (this.isDebris === true && this.canDestroy === true) {
                            UnityEngine.MonoBehaviour.Destroy(this.gameObject);
                        }
                    }
                }

                // Spawn an explosion particle.
                this.asteroidManager.SpawnExplosion(this.transform.position);
            },
            /*UltimateJoystickExample.Spaceship.AsteroidController.OnCollisionEnter end.*/

            /*UltimateJoystickExample.Spaceship.AsteroidController.Explode start.*/
            Explode: function () {
                // If this asteroid has already been destroyed, then return.
                if (this.isDestroyed === true) {
                    return;
                }

                // Let the script know that this asteroid has already been destroyed.
                this.isDestroyed = true;

                // Spawn some debris from this asteroids position.
                this.asteroidManager.SpawnDebris(this.transform.position);

                // Destory this asteroid.
                UnityEngine.MonoBehaviour.Destroy(this.gameObject);
            },
            /*UltimateJoystickExample.Spaceship.AsteroidController.Explode end.*/


        }
    });
    /*UltimateJoystickExample.Spaceship.AsteroidController end.*/

    /*UltimateJoystickExample.Spaceship.GameManager start.*/
    Bridge.define("UltimateJoystickExample.Spaceship.GameManager", {
        inherits: [UnityEngine.MonoBehaviour],
        statics: {
            fields: {
                instance: null
            },
            props: {
                Instance: {
                    get: function () {
                        return UltimateJoystickExample.Spaceship.GameManager.instance;
                    }
                }
            }
        },
        fields: {
            astroidPrefab: null,
            debrisPrefab: null,
            explosionPrefab: null,
            playerExplosionPrefab: null,
            spawning: false,
            spawnTimeMin: 0,
            spawnTimeMax: 0,
            startingAsteroids: 0,
            scoreText: null,
            score: 0,
            asteroidPoints: 0,
            debrisPoints: 0,
            gameOverScreen: null,
            gameOverText: null
        },
        ctors: {
            init: function () {
                this.spawning = true;
                this.spawnTimeMin = 5.0;
                this.spawnTimeMax = 10.0;
                this.startingAsteroids = 2;
                this.score = 0;
                this.asteroidPoints = 50;
                this.debrisPoints = 10;
            }
        },
        methods: {
            /*UltimateJoystickExample.Spaceship.GameManager.Awake start.*/
            Awake: function () {
                // If the instance variable is already assigned...
                if (UnityEngine.MonoBehaviour.op_Inequality(UltimateJoystickExample.Spaceship.GameManager.instance, null)) {
                    // If the instance is currently active...
                    if (UltimateJoystickExample.Spaceship.GameManager.instance.gameObject.activeInHierarchy === true) {
                        // Warn the user that there are multiple Game Managers within the scene and destroy the old manager.
                        UnityEngine.Debug.LogWarning$1("There are multiple instances of the Game Manager script. Removing the old manager from the scene.");
                        UnityEngine.MonoBehaviour.Destroy(UltimateJoystickExample.Spaceship.GameManager.instance.gameObject);
                    }

                    // Remove the old manager.
                    UltimateJoystickExample.Spaceship.GameManager.instance = null;
                }

                // Assign the instance variable as the Game Manager script on this object.
                UltimateJoystickExample.Spaceship.GameManager.instance = this.GetComponent(UltimateJoystickExample.Spaceship.GameManager);
            },
            /*UltimateJoystickExample.Spaceship.GameManager.Awake end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.Start start.*/
            Start: function () {
                // Start spawning the asteroids.
                this.StartCoroutine$2("SpawnTimer");

                // Update the score text to reflect the current score on start.
                this.UpdateScoreText();
            },
            /*UltimateJoystickExample.Spaceship.GameManager.Start end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.SpawnTimer start.*/
            SpawnTimer: function () {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    // Wait for a bit before the initial spawn.
                                        $enumerator.current = new UnityEngine.WaitForSeconds(0.5);
                                        $step = 1;
                                        return true;
                                }
                                case 1: {
                                    // For as many times as the startingAsteroids variable dictates, spawn an asteroid.
                                        for (var i = 0; i < this.startingAsteroids; i = (i + 1) | 0) {
                                            this.SpawnAsteroid();
                                        }

                                        // While spawning is true...
                                    $step = 2;
                                    continue;
                                }
                                case 2: {
                                    if ( this.spawning ) {
                                            $step = 3;
                                            continue;
                                        } 
                                        $step = 5;
                                        continue;
                                }
                                case 3: {
                                    // Wait for a range of seconds determined my the min and max variables.
                                        $enumerator.current = new UnityEngine.WaitForSeconds(UnityEngine.Random.Range$1(this.spawnTimeMin, this.spawnTimeMax));
                                        $step = 4;
                                        return true;
                                }
                                case 4: {
                                    // Spawn an asteroid.
                                        this.SpawnAsteroid();

                                        $step = 2;
                                        continue;
                                }
                                case 5: {

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*UltimateJoystickExample.Spaceship.GameManager.SpawnTimer end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.SpawnAsteroid start.*/
            SpawnAsteroid: function () {
                // Get a random point within a circle area.
                var dir = UnityEngine.Random.insideUnitCircle.$clone();

                // Create a Vector3 varaible to store the spawn position.
                var pos = pc.Vec3.ZERO.clone();

                // If the X value of the spawn direction is greater than the Y, then spawn the asteroid to the left or right of the screen, determined by the value of dir.
                if (Math.abs(dir.x) > Math.abs(dir.y)) {
                    pos = new pc.Vec3( (dir.x === 0 ? 1 : Math.sign(dir.x)) * UnityEngine.Camera.main.orthographicSize * UnityEngine.Camera.main.aspect * 1.3, 0, dir.y * UnityEngine.Camera.main.orthographicSize );
                } else {
                    pos = new pc.Vec3( dir.x * UnityEngine.Camera.main.orthographicSize * UnityEngine.Camera.main.aspect * 1.3, 0, (dir.y === 0 ? 1 : Math.sign(dir.y)) * UnityEngine.Camera.main.orthographicSize );
                }

                // Create the asteroid game object at the position( determined above ), and at a random rotation.
                var ast = UnityEngine.Object.Instantiate$2(UnityEngine.GameObject, this.astroidPrefab, pos, new pc.Quat().setFromEulerAngles_Unity( UnityEngine.Random.value * 360.0, UnityEngine.Random.value * 360.0, UnityEngine.Random.value * 360.0 ));

                // Call the setup function on the asteroid with the desired force and torque.
                ast.GetComponent(UltimateJoystickExample.Spaceship.AsteroidController).Setup(pos.clone().normalize().$clone().scale( -1 ).clone().scale( 1000.0 ), UnityEngine.Random.insideUnitSphere.$clone().clone().scale( UnityEngine.Random.Range$1(500.0, 1500.0) ));

                // Assign the manager component to this instance of the Game Manager.
                ast.GetComponent(UltimateJoystickExample.Spaceship.AsteroidController).asteroidManager = UltimateJoystickExample.Spaceship.GameManager.instance;
            },
            /*UltimateJoystickExample.Spaceship.GameManager.SpawnAsteroid end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.SpawnDebris start.*/
            SpawnDebris: function (pos) {
                // Determine how many debris should be created.
                var numberToSpawn = UnityEngine.Random.Range(3, 6);

                // For each number to spawn...
                for (var i = 0; i < numberToSpawn; i = (i + 1) | 0) {
                    // Create a force to make the debris fly away from eachother.
                    var force = new pc.Quat().setFromEulerAngles_Unity( 0, i * 360.0 / numberToSpawn, 0 ).transformVector( new pc.Vec3( 0, 0, 1 ) ).clone().scale( 5.0 ).clone().scale( 300.0 );

                    // Create the new debris game object at the asteroid's position, plus the forces position to make sure that the debris is positioned correctly. Random rotation as well.
                    var newGO = UnityEngine.Object.Instantiate$2(UnityEngine.GameObject, this.debrisPrefab, pos.$clone().add( force.clone().normalize().$clone().clone().scale( UnityEngine.Random.Range$1(0.0, 5.0) ) ), new pc.Quat().setFromEulerAngles_Unity( 0, UnityEngine.Random.value * 180.0, 0 ));

                    // Apply a random scale factor to make all the debris different.
                    newGO.transform.localScale = new pc.Vec3( UnityEngine.Random.Range$1(0.25, 0.5), UnityEngine.Random.Range$1(0.25, 0.5), UnityEngine.Random.Range$1(0.25, 0.5) );

                    // Setup the needed force and torque.
                    newGO.GetComponent(UltimateJoystickExample.Spaceship.AsteroidController).Setup(force.$clone().scale( 1.0 / ( 2 ) ), UnityEngine.Random.insideUnitSphere.$clone().clone().scale( UnityEngine.Random.Range$1(500.0, 1500.0) ));

                    // Assign the Game Manager component to this instance.
                    newGO.GetComponent(UltimateJoystickExample.Spaceship.AsteroidController).asteroidManager = UltimateJoystickExample.Spaceship.GameManager.instance;
                }
            },
            /*UltimateJoystickExample.Spaceship.GameManager.SpawnDebris end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.SpawnExplosion start.*/
            SpawnExplosion: function (pos) {
                // Create a new explosion prefab game object at the desired position, with default rotation.
                var newParticles = UnityEngine.Object.Instantiate$2(UnityEngine.GameObject, this.explosionPrefab, pos, pc.Quat.IDENTITY.clone());

                // Destory the particles after one second.
                this.Destroy(newParticles, 1);
            },
            /*UltimateJoystickExample.Spaceship.GameManager.SpawnExplosion end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.ShowDeathScreen start.*/
            ShowDeathScreen: function () {
                // Enable the game over screen game object.
                this.gameOverScreen.gameObject.SetActive(true);

                var expl = UnityEngine.Object.Instantiate$2(UnityEngine.GameObject, this.playerExplosionPrefab, UnityEngine.Object.FindObjectOfType(UltimateJoystickExample.Spaceship.PlayerController).transform.position, pc.Quat.IDENTITY.clone());

                this.Destroy(expl, 2);

                // Start the ShakeCamera coroutine for a dynamic effect.
                this.StartCoroutine$2("ShakeCamera");

                // Start the Fade coroutine so that the death screen will fade in.
                this.StartCoroutine$2("FadeDeathScreen");

                // Set spawning to false so that no more asteroids get spawned.
                this.spawning = false;

                UltimateJoystick.GetUltimateJoystick("Movement").UpdatePositioning();
            },
            /*UltimateJoystickExample.Spaceship.GameManager.ShowDeathScreen end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.FadeDeathScreen start.*/
            FadeDeathScreen: function () {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    imageColor,
                    textColor,
                    t,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    // Wait for half a second for a little bit more dynamic effect.
                                        $enumerator.current = new UnityEngine.WaitForSeconds(0.5);
                                        $step = 1;
                                        return true;
                                }
                                case 1: {
                                    // Set the text to the final score text plus the user's score.
                                        this.scoreText.text = "Final Score\n" + (Bridge.toString(this.score) || "");

                                        // Create temporary colors to be able to apply a fade to the image and text.
                                        imageColor = this.gameOverScreen.color.$clone();
                                        textColor = this.gameOverText.color.$clone();

                                        t = 0.0;
                                        $step = 2;
                                        continue;
                                }
                                case 2: {
                                    if ( t < 1.0 ) {
                                            $step = 3;
                                            continue;
                                        }
                                    $step = 6;
                                    continue;
                                }
                                case 3: {
                                    // Lerp the alpha of the temp colors from 0 to 0.75 by the amount of t. 
                                        imageColor.a = pc.math.lerp(0.0, 0.75, t);
                                        textColor.a = pc.math.lerp(0.0, 1.0, t);

                                        // Apply the temp color to the image and text.
                                        this.gameOverScreen.color = imageColor.$clone();
                                        this.gameOverText.color = textColor.$clone();

                                        // Also lerp the font size from 50 to 100 by t.
                                        this.scoreText.fontSize = Bridge.Int.clip32(pc.math.lerp(50, 100, t));

                                        // Wait for next frame.
                                        $enumerator.current = null;
                                        $step = 4;
                                        return true;
                                }
                                case 4: {
                                    $step = 5;
                                    continue;
                                }
                                case 5: {
                                    t += UnityEngine.Time.deltaTime * 3.0;
                                    $step = 2;
                                    continue;
                                }
                                case 6: {
                                    // Apply a finalized amount to the alpha channels.
                                        imageColor.a = 0.75;
                                        textColor.a = 1.0;

                                        // Apply the final color values to the image and text.
                                        this.gameOverScreen.color = imageColor.$clone();
                                        this.gameOverText.color = textColor.$clone();

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*UltimateJoystickExample.Spaceship.GameManager.FadeDeathScreen end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.ModifyScore start.*/
            ModifyScore: function (isDebris) {
                // Increase the score by the appropriate amount.
                this.score = (this.score + (isDebris === true ? this.debrisPoints : this.asteroidPoints)) | 0;

                // Update the score text to reflect the current score.
                this.UpdateScoreText();
            },
            /*UltimateJoystickExample.Spaceship.GameManager.ModifyScore end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.UpdateScoreText start.*/
            UpdateScoreText: function () {
                // Set the visual score amount to reflect the current score value.
                this.scoreText.text = Bridge.toString(this.score);
            },
            /*UltimateJoystickExample.Spaceship.GameManager.UpdateScoreText end.*/

            /*UltimateJoystickExample.Spaceship.GameManager.ShakeCamera start.*/
            ShakeCamera: function () {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    origPos,
                    t,
                    tempVec,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    // Store the original position of the camera.
                                        origPos = UnityEngine.Vector2.FromVector3(UnityEngine.Camera.main.transform.position.$clone());
                                        t = 0.0;
                                        $step = 1;
                                        continue;
                                }
                                case 1: {
                                    if ( t < 1.0 ) {
                                            $step = 2;
                                            continue;
                                        }
                                    $step = 5;
                                    continue;
                                }
                                case 2: {
                                    // Create a temporary vector2 with the camera's original position modified by a random distance from the origin.
                                        tempVec = origPos.$clone().add( UnityEngine.Random.insideUnitCircle );

                                        // Apply the temporary vector.
                                        UnityEngine.Camera.main.transform.position = UnityEngine.Vector3.FromVector2(tempVec.$clone());

                                        // Yield until next frame.
                                        $enumerator.current = null;
                                        $step = 3;
                                        return true;
                                }
                                case 3: {
                                    $step = 4;
                                    continue;
                                }
                                case 4: {
                                    t += UnityEngine.Time.deltaTime * 2.0;
                                    $step = 1;
                                    continue;
                                }
                                case 5: {
                                    // Return back to the original position.
                                        UnityEngine.Camera.main.transform.position = UnityEngine.Vector3.FromVector2(origPos.$clone());

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*UltimateJoystickExample.Spaceship.GameManager.ShakeCamera end.*/


        }
    });
    /*UltimateJoystickExample.Spaceship.GameManager end.*/

    /*UltimateJoystickExample.Spaceship.PlayerController start.*/
    Bridge.define("UltimateJoystickExample.Spaceship.PlayerController", {
        inherits: [UnityEngine.MonoBehaviour],
        fields: {
            rotationSpeed: 0,
            accelerationSpeed: 0,
            maxSpeed: 0,
            shootingCooldown: 0,
            bulletPrefab: null,
            myRigidbody: null,
            gunTrans: null,
            bulletSpawnPos: null,
            playerVisuals: null,
            shootingTimer: 0,
            canControl: false,
            movePosition: null,
            shootPosition: null
        },
        ctors: {
            init: function () {
                this.movePosition = new UnityEngine.Vector3();
                this.shootPosition = new UnityEngine.Vector3();
                this.rotationSpeed = 45.0;
                this.accelerationSpeed = 2.0;
                this.maxSpeed = 3.0;
                this.shootingCooldown = 0.2;
                this.shootingTimer = 0;
                this.canControl = true;
            }
        },
        methods: {
            /*UltimateJoystickExample.Spaceship.PlayerController.Start start.*/
            Start: function () {
                // Store the player's rigidbody.
                this.myRigidbody = this.GetComponent(UnityEngine.Rigidbody);
            },
            /*UltimateJoystickExample.Spaceship.PlayerController.Start end.*/

            /*UltimateJoystickExample.Spaceship.PlayerController.Update start.*/
            Update: function () {
                // Store the input positions
                this.movePosition = new pc.Vec3( UltimateJoystick.GetHorizontalAxis("Movement"), UltimateJoystick.GetVerticalAxis("Movement"), 0 );
                this.shootPosition = new pc.Vec3( UltimateJoystick.GetHorizontalAxis("Shooting"), UltimateJoystick.GetVerticalAxis("Shooting"), 0 );

                // If the user cannot control the player, then return.
                if (this.canControl === false) {
                    return;
                }

                // If the shooting joystick is being used and the shooting timer is ready...
                if (UltimateJoystick.GetJoystickState("Shooting") && this.shootingTimer <= 0) {
                    // Then reset the timer and shoot a bullet.
                    this.shootingTimer = this.shootingCooldown;
                    this.CreateBullets();
                }

                // If the shoot timer is above zero, reduce it.
                if (this.shootingTimer > 0) {
                    this.shootingTimer -= UnityEngine.Time.deltaTime;
                }
            },
            /*UltimateJoystickExample.Spaceship.PlayerController.Update end.*/

            /*UltimateJoystickExample.Spaceship.PlayerController.FixedUpdate start.*/
            FixedUpdate: function () {
                // If the user cannot control the player...
                if (this.canControl === false) {
                    // Then reset the player's rotation, position, velocity and angular vel.
                    this.myRigidbody.rotation = pc.Quat.IDENTITY.clone();
                    this.myRigidbody.position = pc.Vec3.ZERO.clone();
                    this.myRigidbody.velocity = pc.Vec3.ZERO.clone();
                    this.myRigidbody.angularVelocity = pc.Vec3.ZERO.clone();
                } else {
                    // Figure out the rotation that the player should be facing and apply it.
                    var lookRot = new pc.Vec3( this.movePosition.x, 0, this.movePosition.y );
                    this.transform.LookAt$2(this.transform.position.$clone().add( lookRot ));

                    // Also figure out the rotation of the player's gun and apply it.
                    var gunRot = new pc.Vec3( this.shootPosition.x, 0, this.shootPosition.y );
                    this.gunTrans.LookAt$2(this.gunTrans.position.$clone().add( gunRot ));

                    // Apply the input force to the player.
                    this.myRigidbody.AddForce$1(this.transform.forward.$clone().clone().scale( UltimateJoystick.GetDistance("Movement") ).clone().scale( 1000.0 ).clone().scale( this.accelerationSpeed ).clone().scale( UnityEngine.Time.deltaTime ));

                    // If the player's force is greater than the max speed, then normalize it.
                    if (this.myRigidbody.velocity.length() > this.maxSpeed) {
                        this.myRigidbody.velocity = this.myRigidbody.velocity.clone().normalize().$clone().clone().scale( this.maxSpeed );
                    }

                    // Run the CheckExitScreen function to see if the player has left the screen.
                    this.CheckExitScreen();
                }
            },
            /*UltimateJoystickExample.Spaceship.PlayerController.FixedUpdate end.*/

            /*UltimateJoystickExample.Spaceship.PlayerController.CheckExitScreen start.*/
            CheckExitScreen: function () {
                var $t, $t1;
                // If the main camera is not assigned, then return.
                if (UnityEngine.Component.op_Equality(UnityEngine.Camera.main, null)) {
                    return;
                }

                // If the absolute value of the player's X position is greater than the ortho size of the camera multiplied by the camera's aspect ratio, then reset the player on the other side.
                if (Math.abs(this.myRigidbody.position.x) > UnityEngine.Camera.main.orthographicSize * UnityEngine.Camera.main.aspect) {
                    this.myRigidbody.position = new pc.Vec3( -($t = this.myRigidbody.position.x, ($t === 0 ? 1 : Math.sign($t))) * UnityEngine.Camera.main.orthographicSize * UnityEngine.Camera.main.aspect, 0, this.myRigidbody.position.z );
                }

                // If the absolute value of the player's Z position is greater than the ortho size, then reset the Z position to the other side.
                if (Math.abs(this.myRigidbody.position.z) > UnityEngine.Camera.main.orthographicSize) {
                    this.myRigidbody.position = new pc.Vec3( this.myRigidbody.position.x, this.myRigidbody.position.y, -($t1 = this.myRigidbody.position.z, ($t1 === 0 ? 1 : Math.sign($t1))) * UnityEngine.Camera.main.orthographicSize );
                }
            },
            /*UltimateJoystickExample.Spaceship.PlayerController.CheckExitScreen end.*/

            /*UltimateJoystickExample.Spaceship.PlayerController.CreateBullets start.*/
            CreateBullets: function () {
                // Create a new bulletPrefab game object at the barrel's position and rotation.
                var bullet = UnityEngine.Object.Instantiate$2(UnityEngine.GameObject, this.bulletPrefab, this.bulletSpawnPos.position, this.bulletSpawnPos.rotation);

                // Rename the bullet for reference within the asteroid script.
                bullet.name = this.bulletPrefab.name;

                // Apply a speed to the bullet's velocity.
                bullet.GetComponent(UnityEngine.Rigidbody).velocity = bullet.transform.forward.$clone().clone().scale( 200.0 );

                // Destroy the bullet after 3 seconds.
                this.Destroy(bullet, 3.0);
            },
            /*UltimateJoystickExample.Spaceship.PlayerController.CreateBullets end.*/


        }
    });
    /*UltimateJoystickExample.Spaceship.PlayerController end.*/

    /*UltimateJoystickScreenSizeUpdater start.*/
    Bridge.define("UltimateJoystickScreenSizeUpdater", {
        inherits: [UnityEngine.EventSystems.UIBehaviour],
        methods: {
            /*UltimateJoystickScreenSizeUpdater.OnRectTransformDimensionsChange start.*/
            OnRectTransformDimensionsChange: function () {
                if (UnityEngine.GameObject.op_Equality(this.gameObject, null) || !this.gameObject.activeInHierarchy) {
                    return;
                }

                this.StartCoroutine$2("YieldPositioning");
            },
            /*UltimateJoystickScreenSizeUpdater.OnRectTransformDimensionsChange end.*/

            /*UltimateJoystickScreenSizeUpdater.YieldPositioning start.*/
            YieldPositioning: function () {
                var $step = 0,
                    $jumpFromFinally,
                    $returnValue,
                    allJoysticks,
                    $async_e;

                var $enumerator = new Bridge.GeneratorEnumerator(Bridge.fn.bind(this, function () {
                    try {
                        for (;;) {
                            switch ($step) {
                                case 0: {
                                    $enumerator.current = new UnityEngine.WaitForEndOfFrame();
                                        $step = 1;
                                        return true;
                                }
                                case 1: {
                                    allJoysticks = Bridge.as(UnityEngine.Object.FindObjectsOfType$1(UltimateJoystick), System.Array.type(UltimateJoystick));

                                        for (var i = 0; i < allJoysticks.length; i = (i + 1) | 0) {
                                            allJoysticks[i].UpdatePositioning();
                                        }

                                }
                                default: {
                                    return false;
                                }
                            }
                        }
                    } catch($async_e1) {
                        $async_e = System.Exception.create($async_e1);
                        throw $async_e;
                    }
                }));
                return $enumerator;
            },
            /*UltimateJoystickScreenSizeUpdater.YieldPositioning end.*/


        }
    });
    /*UltimateJoystickScreenSizeUpdater end.*/

    /*DynamicJoystick start.*/
    Bridge.define("DynamicJoystick", {
        inherits: [Joystick],
        fields: {
            moveThreshold: 0
        },
        props: {
            MoveThreshold: {
                get: function () {
                    return this.moveThreshold;
                },
                set: function (value) {
                    this.moveThreshold = Math.abs(value);
                }
            }
        },
        alias: [
            "OnPointerDown", "UnityEngine$EventSystems$IPointerDownHandler$OnPointerDown",
            "OnPointerUp", "UnityEngine$EventSystems$IPointerUpHandler$OnPointerUp"
        ],
        ctors: {
            init: function () {
                this.moveThreshold = 1;
            }
        },
        methods: {
            /*DynamicJoystick.Start start.*/
            Start: function () {
                this.MoveThreshold = this.moveThreshold;
                Joystick.prototype.Start.call(this);
                this.background.gameObject.SetActive(false);
            },
            /*DynamicJoystick.Start end.*/

            /*DynamicJoystick.OnPointerDown start.*/
            OnPointerDown: function (eventData) {
                this.background.anchoredPosition = this.ScreenPointToAnchoredPosition(eventData.position);
                this.background.gameObject.SetActive(true);
                Joystick.prototype.OnPointerDown.call(this, eventData);
            },
            /*DynamicJoystick.OnPointerDown end.*/

            /*DynamicJoystick.OnPointerUp start.*/
            OnPointerUp: function (eventData) {
                this.background.gameObject.SetActive(false);
                Joystick.prototype.OnPointerUp.call(this, eventData);
            },
            /*DynamicJoystick.OnPointerUp end.*/

            /*DynamicJoystick.HandleInput start.*/
            HandleInput: function (magnitude, normalised, radius, cam) {
                if (magnitude > this.moveThreshold) {
                    var difference = normalised.$clone().scale( (magnitude - this.moveThreshold) ).mul( radius );
                    this.background.anchoredPosition = this.background.anchoredPosition.$clone().add( difference.$clone() );
                }
                Joystick.prototype.HandleInput.call(this, magnitude, normalised, radius, cam);
            },
            /*DynamicJoystick.HandleInput end.*/


        }
    });
    /*DynamicJoystick end.*/

    /*FixedJoystick start.*/
    Bridge.define("FixedJoystick", {
        inherits: [Joystick]
    });
    /*FixedJoystick end.*/

    /*FloatingJoystick start.*/
    Bridge.define("FloatingJoystick", {
        inherits: [Joystick],
        alias: [
            "OnPointerDown", "UnityEngine$EventSystems$IPointerDownHandler$OnPointerDown",
            "OnPointerUp", "UnityEngine$EventSystems$IPointerUpHandler$OnPointerUp"
        ],
        methods: {
            /*FloatingJoystick.Start start.*/
            Start: function () {
                Joystick.prototype.Start.call(this);
                this.background.gameObject.SetActive(false);
            },
            /*FloatingJoystick.Start end.*/

            /*FloatingJoystick.OnPointerDown start.*/
            OnPointerDown: function (eventData) {
                this.background.anchoredPosition = this.ScreenPointToAnchoredPosition(eventData.position);
                this.background.gameObject.SetActive(true);
                Joystick.prototype.OnPointerDown.call(this, eventData);
            },
            /*FloatingJoystick.OnPointerDown end.*/

            /*FloatingJoystick.OnPointerUp start.*/
            OnPointerUp: function (eventData) {
                this.background.gameObject.SetActive(false);
                Joystick.prototype.OnPointerUp.call(this, eventData);
            },
            /*FloatingJoystick.OnPointerUp end.*/


        }
    });
    /*FloatingJoystick end.*/

    /*VariableJoystick start.*/
    Bridge.define("VariableJoystick", {
        inherits: [Joystick],
        fields: {
            moveThreshold: 0,
            joystickType: 0,
            fixedPosition: null
        },
        props: {
            MoveThreshold: {
                get: function () {
                    return this.moveThreshold;
                },
                set: function (value) {
                    this.moveThreshold = Math.abs(value);
                }
            }
        },
        alias: [
            "OnPointerDown", "UnityEngine$EventSystems$IPointerDownHandler$OnPointerDown",
            "OnPointerUp", "UnityEngine$EventSystems$IPointerUpHandler$OnPointerUp"
        ],
        ctors: {
            init: function () {
                this.fixedPosition = new UnityEngine.Vector2();
                this.moveThreshold = 1;
                this.joystickType = JoystickType.Fixed;
                this.fixedPosition = pc.Vec2.ZERO.clone();
            }
        },
        methods: {
            /*VariableJoystick.SetMode start.*/
            SetMode: function (joystickType) {
                this.joystickType = joystickType;
                if (joystickType === JoystickType.Fixed) {
                    this.background.anchoredPosition = this.fixedPosition.$clone();
                    this.background.gameObject.SetActive(true);
                } else {
                    this.background.gameObject.SetActive(false);
                }
            },
            /*VariableJoystick.SetMode end.*/

            /*VariableJoystick.Start start.*/
            Start: function () {
                Joystick.prototype.Start.call(this);
                this.fixedPosition = this.background.anchoredPosition.$clone();
                this.SetMode(this.joystickType);
            },
            /*VariableJoystick.Start end.*/

            /*VariableJoystick.OnPointerDown start.*/
            OnPointerDown: function (eventData) {
                if (this.joystickType !== JoystickType.Fixed) {
                    this.background.anchoredPosition = this.ScreenPointToAnchoredPosition(eventData.position);
                    this.background.gameObject.SetActive(true);
                }
                Joystick.prototype.OnPointerDown.call(this, eventData);
            },
            /*VariableJoystick.OnPointerDown end.*/

            /*VariableJoystick.OnPointerUp start.*/
            OnPointerUp: function (eventData) {
                if (this.joystickType !== JoystickType.Fixed) {
                    this.background.gameObject.SetActive(false);
                }

                Joystick.prototype.OnPointerUp.call(this, eventData);
            },
            /*VariableJoystick.OnPointerUp end.*/

            /*VariableJoystick.HandleInput start.*/
            HandleInput: function (magnitude, normalised, radius, cam) {
                if (this.joystickType === JoystickType.Dynamic && magnitude > this.moveThreshold) {
                    var difference = normalised.$clone().scale( (magnitude - this.moveThreshold) ).mul( radius );
                    this.background.anchoredPosition = this.background.anchoredPosition.$clone().add( difference.$clone() );
                }
                Joystick.prototype.HandleInput.call(this, magnitude, normalised, radius, cam);
            },
            /*VariableJoystick.HandleInput end.*/


        }
    });
    /*VariableJoystick end.*/

    if ( MODULE_reflection ) {
    var $m = Bridge.setMetadata,
        $n = ["System","UnityEngine","UnityEngine.UI","UnityEngine.EventSystems","System.Collections.Generic","System.Collections","UltimateJoystickExample.Spaceship","UnityEngine.Audio","DG.Tweening.Core","DG.Tweening","DG.Tweening.Plugins.Core.PathCore","System.Globalization","DG.Tweening.Plugins.Options"];

    /*JoystickPlayerExample start.*/
    $m("JoystickPlayerExample", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"FixedUpdate","t":8,"sn":"FixedUpdate","rt":$n[0].Void},{"a":2,"n":"rb","t":4,"rt":$n[1].Rigidbody,"sn":"rb"},{"a":2,"n":"speed","t":4,"rt":$n[0].Single,"sn":"speed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"variableJoystick","t":4,"rt":VariableJoystick,"sn":"variableJoystick"}]}; }, $n);
    /*JoystickPlayerExample end.*/

    /*JoystickSetterExample start.*/
    $m("JoystickSetterExample", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"AxisChanged","t":8,"pi":[{"n":"index","pt":$n[0].Int32,"ps":0}],"sn":"AxisChanged","rt":$n[0].Void,"p":[$n[0].Int32]},{"a":2,"n":"ModeChanged","t":8,"pi":[{"n":"index","pt":$n[0].Int32,"ps":0}],"sn":"ModeChanged","rt":$n[0].Void,"p":[$n[0].Int32]},{"a":2,"n":"SnapX","t":8,"pi":[{"n":"value","pt":$n[0].Boolean,"ps":0}],"sn":"SnapX","rt":$n[0].Void,"p":[$n[0].Boolean]},{"a":2,"n":"SnapY","t":8,"pi":[{"n":"value","pt":$n[0].Boolean,"ps":0}],"sn":"SnapY","rt":$n[0].Void,"p":[$n[0].Boolean]},{"a":1,"n":"Update","t":8,"sn":"Update","rt":$n[0].Void},{"a":2,"n":"axisSprites","t":4,"rt":System.Array.type(UnityEngine.Sprite),"sn":"axisSprites"},{"a":2,"n":"background","t":4,"rt":$n[2].Image,"sn":"background"},{"a":2,"n":"valueText","t":4,"rt":$n[2].Text,"sn":"valueText"},{"a":2,"n":"variableJoystick","t":4,"rt":VariableJoystick,"sn":"variableJoystick"}]}; }, $n);
    /*JoystickSetterExample end.*/

    /*Joystick start.*/
    $m("Joystick", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"FormatInput","t":8,"sn":"FormatInput","rt":$n[0].Void},{"v":true,"a":3,"n":"HandleInput","t":8,"pi":[{"n":"magnitude","pt":$n[0].Single,"ps":0},{"n":"normalised","pt":$n[1].Vector2,"ps":1},{"n":"radius","pt":$n[1].Vector2,"ps":2},{"n":"cam","pt":$n[1].Camera,"ps":3}],"sn":"HandleInput","rt":$n[0].Void,"p":[$n[0].Single,$n[1].Vector2,$n[1].Vector2,$n[1].Camera]},{"a":2,"n":"OnDrag","t":8,"pi":[{"n":"eventData","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnDrag","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"v":true,"a":2,"n":"OnPointerDown","t":8,"pi":[{"n":"eventData","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerDown","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"v":true,"a":2,"n":"OnPointerUp","t":8,"pi":[{"n":"eventData","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerUp","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"a":3,"n":"ScreenPointToAnchoredPosition","t":8,"pi":[{"n":"screenPosition","pt":$n[1].Vector2,"ps":0}],"sn":"ScreenPointToAnchoredPosition","rt":$n[1].Vector2,"p":[$n[1].Vector2]},{"a":1,"n":"SnapFloat","t":8,"pi":[{"n":"value","pt":$n[0].Single,"ps":0},{"n":"snapAxis","pt":AxisOptions,"ps":1}],"sn":"SnapFloat","rt":$n[0].Single,"p":[$n[0].Single,AxisOptions],"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"v":true,"a":3,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void},{"a":2,"n":"AxisOptions","t":16,"rt":AxisOptions,"g":{"a":2,"n":"get_AxisOptions","t":8,"rt":AxisOptions,"fg":"AxisOptions","box":function ($v) { return Bridge.box($v, AxisOptions, System.Enum.toStringFn(AxisOptions));}},"s":{"a":2,"n":"set_AxisOptions","t":8,"p":[AxisOptions],"rt":$n[0].Void,"fs":"AxisOptions"},"fn":"AxisOptions"},{"a":2,"n":"DeadZone","t":16,"rt":$n[0].Single,"g":{"a":2,"n":"get_DeadZone","t":8,"rt":$n[0].Single,"fg":"DeadZone","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},"s":{"a":2,"n":"set_DeadZone","t":8,"p":[$n[0].Single],"rt":$n[0].Void,"fs":"DeadZone"},"fn":"DeadZone"},{"a":2,"n":"Direction","t":16,"rt":$n[1].Vector2,"g":{"a":2,"n":"get_Direction","t":8,"rt":$n[1].Vector2,"fg":"Direction"},"fn":"Direction"},{"a":2,"n":"HandleRange","t":16,"rt":$n[0].Single,"g":{"a":2,"n":"get_HandleRange","t":8,"rt":$n[0].Single,"fg":"HandleRange","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},"s":{"a":2,"n":"set_HandleRange","t":8,"p":[$n[0].Single],"rt":$n[0].Void,"fs":"HandleRange"},"fn":"HandleRange"},{"a":2,"n":"Horizontal","t":16,"rt":$n[0].Single,"g":{"a":2,"n":"get_Horizontal","t":8,"rt":$n[0].Single,"fg":"Horizontal","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},"fn":"Horizontal"},{"a":2,"n":"SnapX","t":16,"rt":$n[0].Boolean,"g":{"a":2,"n":"get_SnapX","t":8,"rt":$n[0].Boolean,"fg":"SnapX","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"s":{"a":2,"n":"set_SnapX","t":8,"p":[$n[0].Boolean],"rt":$n[0].Void,"fs":"SnapX"},"fn":"SnapX"},{"a":2,"n":"SnapY","t":16,"rt":$n[0].Boolean,"g":{"a":2,"n":"get_SnapY","t":8,"rt":$n[0].Boolean,"fg":"SnapY","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"s":{"a":2,"n":"set_SnapY","t":8,"p":[$n[0].Boolean],"rt":$n[0].Void,"fs":"SnapY"},"fn":"SnapY"},{"a":2,"n":"Vertical","t":16,"rt":$n[0].Single,"g":{"a":2,"n":"get_Vertical","t":8,"rt":$n[0].Single,"fg":"Vertical","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},"fn":"Vertical"},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"axisOptions","t":4,"rt":AxisOptions,"sn":"axisOptions","box":function ($v) { return Bridge.box($v, AxisOptions, System.Enum.toStringFn(AxisOptions));}},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":3,"n":"background","t":4,"rt":$n[1].RectTransform,"sn":"background"},{"a":1,"n":"baseRect","t":4,"rt":$n[1].RectTransform,"sn":"baseRect"},{"a":1,"n":"cam","t":4,"rt":$n[1].Camera,"sn":"cam"},{"a":1,"n":"canvas","t":4,"rt":$n[1].Canvas,"sn":"canvas"},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"deadZone","t":4,"rt":$n[0].Single,"sn":"deadZone","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"handleRange","t":4,"rt":$n[0].Single,"sn":"handleRange","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"handleTransform","t":4,"rt":$n[1].RectTransform,"sn":"handleTransform"},{"a":1,"n":"input","t":4,"rt":$n[1].Vector2,"sn":"input"},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"snapX","t":4,"rt":$n[0].Boolean,"sn":"snapX","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"snapY","t":4,"rt":$n[0].Boolean,"sn":"snapY","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}}]}; }, $n);
    /*Joystick end.*/

    /*AxisOptions start.*/
    $m("AxisOptions", function () { return {"att":257,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"Both","is":true,"t":4,"rt":AxisOptions,"sn":"Both","box":function ($v) { return Bridge.box($v, AxisOptions, System.Enum.toStringFn(AxisOptions));}},{"a":2,"n":"Horizontal","is":true,"t":4,"rt":AxisOptions,"sn":"Horizontal","box":function ($v) { return Bridge.box($v, AxisOptions, System.Enum.toStringFn(AxisOptions));}},{"a":2,"n":"Vertical","is":true,"t":4,"rt":AxisOptions,"sn":"Vertical","box":function ($v) { return Bridge.box($v, AxisOptions, System.Enum.toStringFn(AxisOptions));}}]}; }, $n);
    /*AxisOptions end.*/

    /*DynamicJoystick start.*/
    $m("DynamicJoystick", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"ov":true,"a":3,"n":"HandleInput","t":8,"pi":[{"n":"magnitude","pt":$n[0].Single,"ps":0},{"n":"normalised","pt":$n[1].Vector2,"ps":1},{"n":"radius","pt":$n[1].Vector2,"ps":2},{"n":"cam","pt":$n[1].Camera,"ps":3}],"sn":"HandleInput","rt":$n[0].Void,"p":[$n[0].Single,$n[1].Vector2,$n[1].Vector2,$n[1].Camera]},{"ov":true,"a":2,"n":"OnPointerDown","t":8,"pi":[{"n":"eventData","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerDown","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"ov":true,"a":2,"n":"OnPointerUp","t":8,"pi":[{"n":"eventData","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerUp","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"ov":true,"a":3,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void},{"a":2,"n":"MoveThreshold","t":16,"rt":$n[0].Single,"g":{"a":2,"n":"get_MoveThreshold","t":8,"rt":$n[0].Single,"fg":"MoveThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},"s":{"a":2,"n":"set_MoveThreshold","t":8,"p":[$n[0].Single],"rt":$n[0].Void,"fs":"MoveThreshold"},"fn":"MoveThreshold"},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"moveThreshold","t":4,"rt":$n[0].Single,"sn":"moveThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}}]}; }, $n);
    /*DynamicJoystick end.*/

    /*FixedJoystick start.*/
    $m("FixedJoystick", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"}]}; }, $n);
    /*FixedJoystick end.*/

    /*FloatingJoystick start.*/
    $m("FloatingJoystick", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"ov":true,"a":2,"n":"OnPointerDown","t":8,"pi":[{"n":"eventData","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerDown","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"ov":true,"a":2,"n":"OnPointerUp","t":8,"pi":[{"n":"eventData","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerUp","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"ov":true,"a":3,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void}]}; }, $n);
    /*FloatingJoystick end.*/

    /*VariableJoystick start.*/
    $m("VariableJoystick", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"ov":true,"a":3,"n":"HandleInput","t":8,"pi":[{"n":"magnitude","pt":$n[0].Single,"ps":0},{"n":"normalised","pt":$n[1].Vector2,"ps":1},{"n":"radius","pt":$n[1].Vector2,"ps":2},{"n":"cam","pt":$n[1].Camera,"ps":3}],"sn":"HandleInput","rt":$n[0].Void,"p":[$n[0].Single,$n[1].Vector2,$n[1].Vector2,$n[1].Camera]},{"ov":true,"a":2,"n":"OnPointerDown","t":8,"pi":[{"n":"eventData","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerDown","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"ov":true,"a":2,"n":"OnPointerUp","t":8,"pi":[{"n":"eventData","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerUp","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"a":2,"n":"SetMode","t":8,"pi":[{"n":"joystickType","pt":JoystickType,"ps":0}],"sn":"SetMode","rt":$n[0].Void,"p":[JoystickType]},{"ov":true,"a":3,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void},{"a":2,"n":"MoveThreshold","t":16,"rt":$n[0].Single,"g":{"a":2,"n":"get_MoveThreshold","t":8,"rt":$n[0].Single,"fg":"MoveThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},"s":{"a":2,"n":"set_MoveThreshold","t":8,"p":[$n[0].Single],"rt":$n[0].Void,"fs":"MoveThreshold"},"fn":"MoveThreshold"},{"a":1,"n":"fixedPosition","t":4,"rt":$n[1].Vector2,"sn":"fixedPosition"},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"joystickType","t":4,"rt":JoystickType,"sn":"joystickType","box":function ($v) { return Bridge.box($v, JoystickType, System.Enum.toStringFn(JoystickType));}},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"moveThreshold","t":4,"rt":$n[0].Single,"sn":"moveThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}}]}; }, $n);
    /*VariableJoystick end.*/

    /*JoystickType start.*/
    $m("JoystickType", function () { return {"att":257,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"Dynamic","is":true,"t":4,"rt":JoystickType,"sn":"Dynamic","box":function ($v) { return Bridge.box($v, JoystickType, System.Enum.toStringFn(JoystickType));}},{"a":2,"n":"Fixed","is":true,"t":4,"rt":JoystickType,"sn":"Fixed","box":function ($v) { return Bridge.box($v, JoystickType, System.Enum.toStringFn(JoystickType));}},{"a":2,"n":"Floating","is":true,"t":4,"rt":JoystickType,"sn":"Floating","box":function ($v) { return Bridge.box($v, JoystickType, System.Enum.toStringFn(JoystickType));}}]}; }, $n);
    /*JoystickType end.*/

    /*AICarController start.*/
    $m("AICarController", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"Awake","t":8,"sn":"Awake","rt":$n[0].Void},{"a":1,"n":"FixedUpdate","t":8,"sn":"FixedUpdate","rt":$n[0].Void},{"a":1,"n":"HandleDrift","t":8,"sn":"HandleDrift","rt":$n[0].Void},{"a":1,"n":"HandleMovement","t":8,"sn":"HandleMovement","rt":$n[0].Void},{"a":1,"n":"HandleSensor","t":8,"sn":"HandleSensor","rt":$n[0].Void},{"a":1,"n":"UpdateWaypointTarget","t":8,"sn":"UpdateWaypointTarget","rt":$n[0].Void},{"at":[new UnityEngine.RangeAttribute(0.0, 1.0)],"a":2,"n":"baseGrip","t":4,"rt":$n[0].Single,"sn":"baseGrip","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"brakeStrength","t":4,"rt":$n[0].Single,"sn":"brakeStrength","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Movement Settings")],"a":2,"n":"constantForwardForce","t":4,"rt":$n[0].Single,"sn":"constantForwardForce","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"currentGrip","t":4,"rt":$n[0].Single,"sn":"currentGrip","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"currentWaypointIndex","t":4,"rt":$n[0].Int32,"sn":"currentWaypointIndex","box":function ($v) { return Bridge.box($v, System.Int32);}},{"at":[new UnityEngine.RangeAttribute(0.0, 1.0)],"a":2,"n":"driftGripMultiplier","t":4,"rt":$n[0].Single,"sn":"driftGripMultiplier","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"driftTorqueMultiplier","t":4,"rt":$n[0].Single,"sn":"driftTorqueMultiplier","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Drift Kick Out Settings")],"a":2,"n":"kickOutForce","t":4,"rt":$n[0].Single,"sn":"kickOutForce","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"kickOutSpeedThreshold","t":4,"rt":$n[0].Single,"sn":"kickOutSpeedThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"kickOutSteerThreshold","t":4,"rt":$n[0].Single,"sn":"kickOutSteerThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"maxSpeed","t":4,"rt":$n[0].Single,"sn":"maxSpeed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"rb","t":4,"rt":$n[1].Rigidbody,"sn":"rb"},{"at":[new UnityEngine.HeaderAttribute("Raycast Sensor")],"a":2,"n":"sensorLength","t":4,"rt":$n[0].Single,"sn":"sensorLength","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"steerAmount","t":4,"rt":$n[0].Single,"sn":"steerAmount","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"steerStrength","t":4,"rt":$n[0].Single,"sn":"steerStrength","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"targetDirection","t":4,"rt":$n[1].Vector3,"sn":"targetDirection"},{"a":2,"n":"waypointReachThreshold","t":4,"rt":$n[0].Single,"sn":"waypointReachThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Waypoints")],"a":2,"n":"waypoints","t":4,"rt":$n[4].List$1(UnityEngine.Transform),"sn":"waypoints"}]}; }, $n);
    /*AICarController end.*/

    /*AudioManager start.*/
    $m("AudioManager", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"Awake","t":8,"sn":"Awake","rt":$n[0].Void},{"a":2,"n":"Instance","is":true,"t":16,"rt":AudioManager,"g":{"a":2,"n":"get_Instance","t":8,"rt":AudioManager,"fg":"Instance","is":true},"fn":"Instance"},{"a":2,"n":"audClip_ClickBtn","t":4,"rt":$n[1].AudioClip,"sn":"audClip_ClickBtn"},{"a":1,"n":"instance","is":true,"t":4,"rt":AudioManager,"sn":"instance"}]}; }, $n);
    /*AudioManager end.*/

    /*Camera_Follow start.*/
    $m("Camera_Follow", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"Awake","t":8,"sn":"Awake","rt":$n[0].Void},{"a":1,"n":"LateUpdate","t":8,"sn":"LateUpdate","rt":$n[0].Void},{"a":1,"n":"Update","t":8,"sn":"Update","rt":$n[0].Void},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"mainCamera","t":4,"rt":$n[1].Camera,"sn":"mainCamera"},{"a":2,"n":"moveSpeed","t":4,"rt":$n[0].Single,"sn":"moveSpeed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"offset","t":4,"rt":$n[1].Vector3,"sn":"offset"},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"transTarget","t":4,"rt":$n[1].Transform,"sn":"transTarget"}]}; }, $n);
    /*Camera_Follow end.*/

    /*EndView start.*/
    $m("EndView", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"OnClick_CTA","t":8,"sn":"OnClick_CTA","rt":$n[0].Void},{"a":2,"n":"ShowView","t":8,"pi":[{"n":"isWin","dv":false,"o":true,"pt":$n[0].Boolean,"ps":0}],"sn":"ShowView","rt":$n[0].Void,"p":[$n[0].Boolean]},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"audioSource","t":4,"rt":$n[1].AudioSource,"sn":"audioSource"},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"trans_Container","t":4,"rt":$n[1].Transform,"sn":"trans_Container"},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"txt_WinLose","t":4,"rt":$n[2].Text,"sn":"txt_WinLose"}]}; }, $n);
    /*EndView end.*/

    /*FinishLine_Checker start.*/
    $m("FinishLine_Checker", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"OnTriggerEnter","t":8,"pi":[{"n":"other","pt":$n[1].Collider,"ps":0}],"sn":"OnTriggerEnter","rt":$n[0].Void,"p":[$n[1].Collider]}]}; }, $n);
    /*FinishLine_Checker end.*/

    /*PlayerController start.*/
    $m("PlayerController", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"ApplyForwardForce","t":8,"sn":"ApplyForwardForce","rt":$n[0].Void},{"a":1,"n":"ApplySteering","t":8,"sn":"ApplySteering","rt":$n[0].Void},{"a":1,"n":"Awake","t":8,"sn":"Awake","rt":$n[0].Void},{"a":1,"n":"CheckStuckWithRaycast","t":8,"sn":"CheckStuckWithRaycast","rt":$n[0].Void},{"a":1,"n":"FixedUpdate","t":8,"sn":"FixedUpdate","rt":$n[0].Void},{"a":1,"n":"HandleDrift","t":8,"sn":"HandleDrift","rt":$n[0].Void},{"a":1,"n":"LimitRotation","t":8,"sn":"LimitRotation","rt":$n[0].Void},{"a":1,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void},{"a":1,"n":"Update","t":8,"sn":"Update","rt":$n[0].Void},{"at":[new UnityEngine.RangeAttribute(0.0, 1.0)],"a":2,"n":"baseGrip","t":4,"rt":$n[0].Single,"sn":"baseGrip","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"brakeStrength","t":4,"rt":$n[0].Single,"sn":"brakeStrength","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Movement Settings"),new UnityEngine.LunaPlaygroundFieldAttribute("Player Acceleration", 0, "Player Controls", false, null)],"a":2,"n":"constantForwardForce","t":4,"rt":$n[0].Single,"sn":"constantForwardForce","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"currentGrip","t":4,"rt":$n[0].Single,"sn":"currentGrip","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.RangeAttribute(0.0, 1.0)],"a":2,"n":"driftGripMultiplier","t":4,"rt":$n[0].Single,"sn":"driftGripMultiplier","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"driftSpeedThreshold","t":4,"rt":$n[0].Single,"sn":"driftSpeedThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"driftSteerThreshold","t":4,"rt":$n[0].Single,"sn":"driftSteerThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"driftTorqueMultiplier","t":4,"rt":$n[0].Single,"sn":"driftTorqueMultiplier","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"initialYaw","t":4,"rt":$n[0].Single,"sn":"initialYaw","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"isBlocked","t":4,"rt":$n[0].Boolean,"sn":"isBlocked","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":1,"n":"isBraking","t":4,"rt":$n[0].Boolean,"sn":"isBraking","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"at":[new UnityEngine.HeaderAttribute("Joystick"),new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"joystick","t":4,"rt":Joystick,"sn":"joystick"},{"at":[new UnityEngine.HeaderAttribute("Drift Kick Out Settings")],"a":2,"n":"kickOutForce","t":4,"rt":$n[0].Single,"sn":"kickOutForce","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"lastRayCheckTime","t":4,"rt":$n[0].Single,"sn":"lastRayCheckTime","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Rotation Limits"),new UnityEngine.LunaPlaygroundFieldStepAttribute(1.0),new UnityEngine.LunaPlaygroundFieldAttribute("Player Max Steer Angle", 3, "Player Controls", false, null),new UnityEngine.RangeAttribute(0.0, 140.0)],"a":2,"n":"maxRotationAngle","t":4,"rt":$n[0].Single,"sn":"maxRotationAngle","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.LunaPlaygroundFieldAttribute("Player Max Speed", 1, "Player Controls", false, null)],"a":2,"n":"maxSpeed","t":4,"rt":$n[0].Single,"sn":"maxSpeed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"maxStuckTime","t":4,"rt":$n[0].Single,"sn":"maxStuckTime","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"obstacleMask","t":4,"rt":$n[1].LayerMask,"sn":"obstacleMask"},{"a":2,"n":"raySpacing","t":4,"rt":$n[0].Single,"sn":"raySpacing","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Rotation Limits")],"a":1,"n":"rb","t":4,"rt":$n[1].Rigidbody,"sn":"rb"},{"a":1,"n":"steerAmount","t":4,"rt":$n[0].Single,"sn":"steerAmount","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.LunaPlaygroundFieldAttribute("Player Steer Strength", 2, "Player Controls", false, null)],"a":2,"n":"steerStrength","t":4,"rt":$n[0].Single,"sn":"steerStrength","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"stuckDuration","t":4,"rt":$n[0].Single,"sn":"stuckDuration","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"stuckRayCheckInterval","t":4,"rt":$n[0].Single,"sn":"stuckRayCheckInterval","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Stuck Raycast Settings")],"a":2,"n":"stuckRayLength","t":4,"rt":$n[0].Single,"sn":"stuckRayLength","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"unstuckMoveDistance","t":4,"rt":$n[0].Single,"sn":"unstuckMoveDistance","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}}]}; }, $n);
    /*PlayerController end.*/

    /*RigidbodyDriftController start.*/
    $m("RigidbodyDriftController", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"ApplyForwardForce","t":8,"sn":"ApplyForwardForce","rt":$n[0].Void},{"a":1,"n":"ApplySteering","t":8,"sn":"ApplySteering","rt":$n[0].Void},{"a":1,"n":"Awake","t":8,"sn":"Awake","rt":$n[0].Void},{"a":1,"n":"FixedUpdate","t":8,"sn":"FixedUpdate","rt":$n[0].Void},{"a":1,"n":"HandleDrift","t":8,"sn":"HandleDrift","rt":$n[0].Void},{"a":1,"n":"LimitRotation","t":8,"sn":"LimitRotation","rt":$n[0].Void},{"a":1,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void},{"a":1,"n":"Update","t":8,"sn":"Update","rt":$n[0].Void},{"at":[new UnityEngine.RangeAttribute(0.0, 1.0)],"a":2,"n":"baseGrip","t":4,"rt":$n[0].Single,"sn":"baseGrip","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"brakeStrength","t":4,"rt":$n[0].Single,"sn":"brakeStrength","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Movement Settings")],"a":2,"n":"constantForwardForce","t":4,"rt":$n[0].Single,"sn":"constantForwardForce","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"currentGrip","t":4,"rt":$n[0].Single,"sn":"currentGrip","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.RangeAttribute(0.0, 1.0)],"a":2,"n":"driftGripMultiplier","t":4,"rt":$n[0].Single,"sn":"driftGripMultiplier","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"driftSpeedThreshold","t":4,"rt":$n[0].Single,"sn":"driftSpeedThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"driftSteerThreshold","t":4,"rt":$n[0].Single,"sn":"driftSteerThreshold","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"driftTorqueMultiplier","t":4,"rt":$n[0].Single,"sn":"driftTorqueMultiplier","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"initialYaw","t":4,"rt":$n[0].Single,"sn":"initialYaw","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"isBraking","t":4,"rt":$n[0].Boolean,"sn":"isBraking","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"joystick","t":4,"rt":Joystick,"sn":"joystick"},{"at":[new UnityEngine.HeaderAttribute("Drift Kick Out Settings")],"a":2,"n":"kickOutForce","t":4,"rt":$n[0].Single,"sn":"kickOutForce","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Rotation Limits"),new UnityEngine.RangeAttribute(0.0, 140.0)],"a":2,"n":"maxRotationAngle","t":4,"rt":$n[0].Single,"sn":"maxRotationAngle","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"maxSpeed","t":4,"rt":$n[0].Single,"sn":"maxSpeed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"rb","t":4,"rt":$n[1].Rigidbody,"sn":"rb"},{"a":1,"n":"steerAmount","t":4,"rt":$n[0].Single,"sn":"steerAmount","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"steerStrength","t":4,"rt":$n[0].Single,"sn":"steerStrength","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Rotation Limits"),new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"ultimate_Joystick","t":4,"rt":UltimateJoystick,"sn":"ultimate_Joystick"}]}; }, $n);
    /*RigidbodyDriftController end.*/

    /*SystemManager start.*/
    $m("SystemManager", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"Awake","t":8,"sn":"Awake","rt":$n[0].Void},{"a":2,"n":"EndGame","t":8,"pi":[{"n":"isWin","pt":$n[0].Boolean,"ps":0}],"sn":"EndGame","rt":$n[0].Void,"p":[$n[0].Boolean]},{"a":1,"n":"IE_Wait_ShowEndView","t":8,"pi":[{"n":"isWin","pt":$n[0].Boolean,"ps":0}],"sn":"IE_Wait_ShowEndView","rt":$n[5].IEnumerator,"p":[$n[0].Boolean]},{"a":2,"n":"OnClick_CTA","t":8,"sn":"OnClick_CTA","rt":$n[0].Void},{"a":1,"n":"SetDefault","t":8,"sn":"SetDefault","rt":$n[0].Void},{"a":1,"n":"Update","t":8,"sn":"Update","rt":$n[0].Void},{"a":2,"n":"GameEnded","t":16,"rt":$n[0].Boolean,"g":{"a":2,"n":"get_GameEnded","t":8,"rt":$n[0].Boolean,"fg":"GameEnded","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"fn":"GameEnded"},{"a":2,"n":"GameStarted","t":16,"rt":$n[0].Boolean,"g":{"a":2,"n":"get_GameStarted","t":8,"rt":$n[0].Boolean,"fg":"GameStarted","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"fn":"GameStarted"},{"a":2,"n":"Instance","is":true,"t":16,"rt":SystemManager,"g":{"a":2,"n":"get_Instance","t":8,"rt":SystemManager,"fg":"Instance","is":true},"fn":"Instance"},{"a":1,"n":"gameEnded","t":4,"rt":$n[0].Boolean,"sn":"gameEnded","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":1,"n":"gameStarted","t":4,"rt":$n[0].Boolean,"sn":"gameStarted","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":1,"n":"instance","is":true,"t":4,"rt":SystemManager,"sn":"instance"},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"joyStick","t":4,"rt":Joystick,"sn":"joyStick"},{"a":1,"n":"time_Delay_ShowEnd","t":4,"rt":$n[0].Single,"sn":"time_Delay_ShowEnd","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"view_EndGame","t":4,"rt":EndView,"sn":"view_EndGame"},{"at":[new UnityEngine.HeaderAttribute("Views"),new UnityEngine.SerializeFieldAttribute()],"a":1,"n":"view_UI_Tutorial","t":4,"rt":$n[1].GameObject,"sn":"view_UI_Tutorial"}]}; }, $n);
    /*SystemManager end.*/

    /*UltimateJoystick start.*/
    $m("UltimateJoystick", function () { return {"nested":[UltimateJoystick.ScalingAxis,UltimateJoystick.Anchor,UltimateJoystick.Axis,UltimateJoystick.Boundary,UltimateJoystick.TapCountOption,UltimateJoystick.TensionType],"att":1048577,"a":2,"at":[new UnityEngine.ExecuteInEditModeAttribute()],"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"Awake","t":8,"sn":"Awake","rt":$n[0].Void},{"a":2,"n":"DisableJoystick","t":8,"sn":"DisableJoystick","rt":$n[0].Void},{"a":2,"n":"DisableJoystick","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"DisableJoystick","rt":$n[0].Void,"p":[$n[0].String]},{"a":2,"n":"EnableJoystick","t":8,"sn":"EnableJoystick","rt":$n[0].Void},{"a":2,"n":"EnableJoystick","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"EnableJoystick","rt":$n[0].Void,"p":[$n[0].String]},{"a":2,"n":"GetDistance","t":8,"sn":"GetDistance","rt":$n[0].Single,"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"GetDistance","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"GetDistance","rt":$n[0].Single,"p":[$n[0].String],"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"GetHorizontalAxis","t":8,"sn":"GetHorizontalAxis","rt":$n[0].Single,"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"GetHorizontalAxis","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"GetHorizontalAxis","rt":$n[0].Single,"p":[$n[0].String],"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"GetHorizontalAxisRaw","t":8,"sn":"GetHorizontalAxisRaw","rt":$n[0].Single,"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"GetHorizontalAxisRaw","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"GetHorizontalAxisRaw","rt":$n[0].Single,"p":[$n[0].String],"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"GetJoystickState","t":8,"sn":"GetJoystickState","rt":$n[0].Boolean,"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"GetJoystickState","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"GetJoystickState","rt":$n[0].Boolean,"p":[$n[0].String],"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"GetTapCount","t":8,"sn":"GetTapCount","rt":$n[0].Boolean,"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"GetTapCount","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"GetTapCount","rt":$n[0].Boolean,"p":[$n[0].String],"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"GetUltimateJoystick","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"GetUltimateJoystick","rt":UltimateJoystick,"p":[$n[0].String]},{"a":2,"n":"GetVerticalAxis","t":8,"sn":"GetVerticalAxis","rt":$n[0].Single,"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"GetVerticalAxis","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"GetVerticalAxis","rt":$n[0].Single,"p":[$n[0].String],"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"GetVerticalAxisRaw","t":8,"sn":"GetVerticalAxisRaw","rt":$n[0].Single,"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"GetVerticalAxisRaw","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"GetVerticalAxisRaw","rt":$n[0].Single,"p":[$n[0].String],"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"GravityHandler","t":8,"sn":"GravityHandler","rt":$n[5].IEnumerator},{"a":2,"n":"InputInRange","t":8,"pi":[{"n":"inputPosition","pt":$n[1].Vector2,"ps":0}],"sn":"InputInRange","rt":$n[0].Boolean,"p":[$n[1].Vector2],"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"InputInRange","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0},{"n":"inputPosition","pt":$n[1].Vector2,"ps":1}],"sn":"InputInRange","rt":$n[0].Boolean,"p":[$n[0].String,$n[1].Vector2],"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":1,"n":"InputTransition","t":8,"sn":"InputTransition","rt":$n[5].IEnumerator},{"a":1,"n":"JoystickConfirmed","is":true,"t":8,"pi":[{"n":"joystickName","pt":$n[0].String,"ps":0}],"sn":"JoystickConfirmed","rt":$n[0].Boolean,"p":[$n[0].String],"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":1,"n":"OnApplicationFocus","t":8,"pi":[{"n":"focus","pt":$n[0].Boolean,"ps":0}],"sn":"OnApplicationFocus","rt":$n[0].Void,"p":[$n[0].Boolean]},{"a":2,"n":"OnDrag","t":8,"pi":[{"n":"touchInfo","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnDrag","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"a":2,"n":"OnPointerDown","t":8,"pi":[{"n":"touchInfo","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerDown","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"a":2,"n":"OnPointerUp","t":8,"pi":[{"n":"touchInfo","pt":$n[3].PointerEventData,"ps":0}],"sn":"OnPointerUp","rt":$n[0].Void,"p":[$n[3].PointerEventData]},{"a":1,"n":"OnTransformParentChanged","t":8,"sn":"OnTransformParentChanged","rt":$n[0].Void},{"a":1,"n":"ProcessInput","t":8,"pi":[{"n":"inputPosition","pt":$n[1].Vector2,"ps":0}],"sn":"ProcessInput","rt":$n[0].Void,"p":[$n[1].Vector2]},{"a":1,"n":"ResetJoystick","t":8,"sn":"ResetJoystick","rt":$n[0].Void},{"a":1,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void},{"a":1,"n":"TapCountDelay","t":8,"sn":"TapCountDelay","rt":$n[5].IEnumerator},{"a":1,"n":"TapCountdown","t":8,"sn":"TapCountdown","rt":$n[5].IEnumerator},{"a":1,"n":"TensionAccentDisplay","t":8,"sn":"TensionAccentDisplay","rt":$n[0].Void},{"a":1,"n":"TensionAccentReset","t":8,"sn":"TensionAccentReset","rt":$n[0].Void},{"a":2,"n":"UpdateHighlightColor","t":8,"pi":[{"n":"targetColor","pt":$n[1].Color,"ps":0}],"sn":"UpdateHighlightColor","rt":$n[0].Void,"p":[$n[1].Color]},{"a":1,"n":"UpdateJoystickCenter","t":8,"sn":"UpdateJoystickCenter","rt":$n[0].Void},{"a":1,"n":"UpdateJoystickPositioning","t":8,"sn":"UpdateJoystickPositioning","rt":$n[0].Void},{"a":2,"n":"UpdateParentCanvas","t":8,"sn":"UpdateParentCanvas","rt":$n[0].Void},{"a":1,"n":"UpdatePositionValues","t":8,"sn":"UpdatePositionValues","rt":$n[0].Void},{"a":2,"n":"UpdatePositioning","t":8,"sn":"UpdatePositioning","rt":$n[0].Void},{"a":2,"n":"UpdateTensionColors","t":8,"pi":[{"n":"targetTensionNone","pt":$n[1].Color,"ps":0},{"n":"targetTensionFull","pt":$n[1].Color,"ps":1}],"sn":"UpdateTensionColors","rt":$n[0].Void,"p":[$n[1].Color,$n[1].Color]},{"a":2,"n":"HorizontalAxis","t":16,"rt":$n[0].Single,"g":{"a":2,"n":"get_HorizontalAxis","t":8,"rt":$n[0].Single,"fg":"HorizontalAxis","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},"s":{"a":1,"n":"set_HorizontalAxis","t":8,"p":[$n[0].Single],"rt":$n[0].Void,"fs":"HorizontalAxis"},"fn":"HorizontalAxis"},{"a":2,"n":"ParentCanvas","t":16,"rt":$n[1].Canvas,"g":{"a":2,"n":"get_ParentCanvas","t":8,"rt":$n[1].Canvas,"fg":"ParentCanvas"},"s":{"a":1,"n":"set_ParentCanvas","t":8,"p":[$n[1].Canvas],"rt":$n[0].Void,"fs":"ParentCanvas"},"fn":"ParentCanvas"},{"a":2,"n":"VerticalAxis","t":16,"rt":$n[0].Single,"g":{"a":2,"n":"get_VerticalAxis","t":8,"rt":$n[0].Single,"fg":"VerticalAxis","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},"s":{"a":1,"n":"set_VerticalAxis","t":8,"p":[$n[0].Single],"rt":$n[0].Void,"fs":"VerticalAxis"},"fn":"VerticalAxis"},{"a":2,"n":"TensionAccents","t":4,"rt":$n[4].List$1(UnityEngine.UI.Image),"sn":"TensionAccents"},{"a":1,"n":"UltimateJoysticks","is":true,"t":4,"rt":$n[4].Dictionary$2(System.String,UltimateJoystick),"sn":"UltimateJoysticks"},{"a":2,"n":"activationHeight","t":4,"rt":$n[0].Single,"sn":"activationHeight","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"activationPositionHorizontal","t":4,"rt":$n[0].Single,"sn":"activationPositionHorizontal","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"activationPositionVertical","t":4,"rt":$n[0].Single,"sn":"activationPositionVertical","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"activationRange","t":4,"rt":$n[0].Single,"sn":"activationRange","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"activationWidth","t":4,"rt":$n[0].Single,"sn":"activationWidth","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"anchor","t":4,"rt":UltimateJoystick.Anchor,"sn":"anchor","box":function ($v) { return Bridge.box($v, UltimateJoystick.Anchor, System.Enum.toStringFn(UltimateJoystick.Anchor));}},{"a":2,"n":"axis","t":4,"rt":UltimateJoystick.Axis,"sn":"axis","box":function ($v) { return Bridge.box($v, UltimateJoystick.Axis, System.Enum.toStringFn(UltimateJoystick.Axis));}},{"a":1,"n":"baseTrans","t":4,"rt":$n[1].RectTransform,"sn":"baseTrans"},{"a":2,"n":"boundary","t":4,"rt":UltimateJoystick.Boundary,"sn":"boundary","box":function ($v) { return Bridge.box($v, UltimateJoystick.Boundary, System.Enum.toStringFn(UltimateJoystick.Boundary));}},{"a":1,"n":"canvasRectTrans","t":4,"rt":$n[1].RectTransform,"sn":"canvasRectTrans"},{"a":1,"n":"currentTapTime","t":4,"rt":$n[0].Single,"sn":"currentTapTime","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"customActivationRange","t":4,"rt":$n[0].Boolean,"sn":"customActivationRange","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"deadZone","t":4,"rt":$n[0].Single,"sn":"deadZone","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"defaultPos","t":4,"rt":$n[1].Vector2,"sn":"defaultPos"},{"a":2,"n":"disableVisuals","t":4,"rt":$n[0].Boolean,"sn":"disableVisuals","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"dynamicPositioning","t":4,"rt":$n[0].Boolean,"sn":"dynamicPositioning","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"extendRadius","t":4,"rt":$n[0].Boolean,"sn":"extendRadius","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"fadeTouched","t":4,"rt":$n[0].Single,"sn":"fadeTouched","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"fadeUntouched","t":4,"rt":$n[0].Single,"sn":"fadeUntouched","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"gravity","t":4,"rt":$n[0].Single,"sn":"gravity","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"gravityActive","t":4,"rt":$n[0].Boolean,"sn":"gravityActive","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"highlightBase","t":4,"rt":$n[2].Image,"sn":"highlightBase"},{"a":2,"n":"highlightColor","t":4,"rt":$n[1].Color,"sn":"highlightColor"},{"a":2,"n":"highlightJoystick","t":4,"rt":$n[2].Image,"sn":"highlightJoystick"},{"a":2,"n":"inputTransition","t":4,"rt":$n[0].Boolean,"sn":"inputTransition","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"joystick","t":4,"rt":$n[1].RectTransform,"sn":"joystick"},{"a":2,"n":"joystickBase","t":4,"rt":$n[1].RectTransform,"sn":"joystickBase"},{"a":1,"n":"joystickCenter","t":4,"rt":$n[1].Vector2,"sn":"joystickCenter"},{"a":1,"n":"joystickGroup","t":4,"rt":$n[1].CanvasGroup,"sn":"joystickGroup"},{"a":2,"n":"joystickName","t":4,"rt":$n[0].String,"sn":"joystickName"},{"a":1,"n":"joystickRect","t":4,"rt":$n[1].Rect,"sn":"joystickRect"},{"a":2,"n":"joystickSize","t":4,"rt":$n[0].Single,"sn":"joystickSize","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"joystickState","t":4,"rt":$n[0].Boolean,"sn":"joystickState","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"positionHorizontal","t":4,"rt":$n[0].Single,"sn":"positionHorizontal","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"positionVertical","t":4,"rt":$n[0].Single,"sn":"positionVertical","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"radius","t":4,"rt":$n[0].Single,"sn":"radius","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"radiusModifier","t":4,"rt":$n[0].Single,"sn":"radiusModifier","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"rotationOffset","t":4,"rt":$n[0].Single,"sn":"rotationOffset","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"scaleTouched","t":4,"rt":$n[0].Single,"sn":"scaleTouched","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"scalingAxis","t":4,"rt":UltimateJoystick.ScalingAxis,"sn":"scalingAxis","box":function ($v) { return Bridge.box($v, UltimateJoystick.ScalingAxis, System.Enum.toStringFn(UltimateJoystick.ScalingAxis));}},{"a":2,"n":"showHighlight","t":4,"rt":$n[0].Boolean,"sn":"showHighlight","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"showTension","t":4,"rt":$n[0].Boolean,"sn":"showTension","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":1,"n":"tapCount","t":4,"rt":$n[0].Int32,"sn":"tapCount","box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":1,"n":"tapCountAchieved","t":4,"rt":$n[0].Boolean,"sn":"tapCountAchieved","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"tapCountDuration","t":4,"rt":$n[0].Single,"sn":"tapCountDuration","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"tapCountOption","t":4,"rt":UltimateJoystick.TapCountOption,"sn":"tapCountOption","box":function ($v) { return Bridge.box($v, UltimateJoystick.TapCountOption, System.Enum.toStringFn(UltimateJoystick.TapCountOption));}},{"a":2,"n":"targetTapCount","t":4,"rt":$n[0].Int32,"sn":"targetTapCount","box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"tensionColorFull","t":4,"rt":$n[1].Color,"sn":"tensionColorFull"},{"a":2,"n":"tensionColorNone","t":4,"rt":$n[1].Color,"sn":"tensionColorNone"},{"a":2,"n":"tensionDeadZone","t":4,"rt":$n[0].Single,"sn":"tensionDeadZone","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"tensionType","t":4,"rt":UltimateJoystick.TensionType,"sn":"tensionType","box":function ($v) { return Bridge.box($v, UltimateJoystick.TensionType, System.Enum.toStringFn(UltimateJoystick.TensionType));}},{"a":2,"n":"transitionTouchedDuration","t":4,"rt":$n[0].Single,"sn":"transitionTouchedDuration","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"transitionTouchedSpeed","t":4,"rt":$n[0].Single,"sn":"transitionTouchedSpeed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"transitionUntouchedDuration","t":4,"rt":$n[0].Single,"sn":"transitionUntouchedDuration","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"transitionUntouchedSpeed","t":4,"rt":$n[0].Single,"sn":"transitionUntouchedSpeed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"useFade","t":4,"rt":$n[0].Boolean,"sn":"useFade","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"useScale","t":4,"rt":$n[0].Boolean,"sn":"useScale","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"OnDragCallback","t":2,"ad":{"a":2,"n":"add_OnDragCallback","t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"addOnDragCallback","rt":$n[0].Void,"p":[Function]},"r":{"a":2,"n":"remove_OnDragCallback","t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"removeOnDragCallback","rt":$n[0].Void,"p":[Function]}},{"a":2,"n":"OnPointerDownCallback","t":2,"ad":{"a":2,"n":"add_OnPointerDownCallback","t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"addOnPointerDownCallback","rt":$n[0].Void,"p":[Function]},"r":{"a":2,"n":"remove_OnPointerDownCallback","t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"removeOnPointerDownCallback","rt":$n[0].Void,"p":[Function]}},{"a":2,"n":"OnPointerUpCallback","t":2,"ad":{"a":2,"n":"add_OnPointerUpCallback","t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"addOnPointerUpCallback","rt":$n[0].Void,"p":[Function]},"r":{"a":2,"n":"remove_OnPointerUpCallback","t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"removeOnPointerUpCallback","rt":$n[0].Void,"p":[Function]}},{"a":2,"n":"OnUpdatePositioning","t":2,"ad":{"a":2,"n":"add_OnUpdatePositioning","t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"addOnUpdatePositioning","rt":$n[0].Void,"p":[Function]},"r":{"a":2,"n":"remove_OnUpdatePositioning","t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"removeOnUpdatePositioning","rt":$n[0].Void,"p":[Function]}},{"a":1,"backing":true,"n":"<HorizontalAxis>k__BackingField","t":4,"rt":$n[0].Single,"sn":"HorizontalAxis","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"backing":true,"n":"<ParentCanvas>k__BackingField","t":4,"rt":$n[1].Canvas,"sn":"ParentCanvas"},{"a":1,"backing":true,"n":"<VerticalAxis>k__BackingField","t":4,"rt":$n[0].Single,"sn":"VerticalAxis","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}}]}; }, $n);
    /*UltimateJoystick end.*/

    /*UltimateJoystick+ScalingAxis start.*/
    $m("UltimateJoystick.ScalingAxis", function () { return {"td":UltimateJoystick,"att":258,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"Height","is":true,"t":4,"rt":UltimateJoystick.ScalingAxis,"sn":"Height","box":function ($v) { return Bridge.box($v, UltimateJoystick.ScalingAxis, System.Enum.toStringFn(UltimateJoystick.ScalingAxis));}},{"a":2,"n":"Width","is":true,"t":4,"rt":UltimateJoystick.ScalingAxis,"sn":"Width","box":function ($v) { return Bridge.box($v, UltimateJoystick.ScalingAxis, System.Enum.toStringFn(UltimateJoystick.ScalingAxis));}}]}; }, $n);
    /*UltimateJoystick+ScalingAxis end.*/

    /*UltimateJoystick+Anchor start.*/
    $m("UltimateJoystick.Anchor", function () { return {"td":UltimateJoystick,"att":258,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"Left","is":true,"t":4,"rt":UltimateJoystick.Anchor,"sn":"Left","box":function ($v) { return Bridge.box($v, UltimateJoystick.Anchor, System.Enum.toStringFn(UltimateJoystick.Anchor));}},{"a":2,"n":"Right","is":true,"t":4,"rt":UltimateJoystick.Anchor,"sn":"Right","box":function ($v) { return Bridge.box($v, UltimateJoystick.Anchor, System.Enum.toStringFn(UltimateJoystick.Anchor));}}]}; }, $n);
    /*UltimateJoystick+Anchor end.*/

    /*UltimateJoystick+Axis start.*/
    $m("UltimateJoystick.Axis", function () { return {"td":UltimateJoystick,"att":258,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"Both","is":true,"t":4,"rt":UltimateJoystick.Axis,"sn":"Both","box":function ($v) { return Bridge.box($v, UltimateJoystick.Axis, System.Enum.toStringFn(UltimateJoystick.Axis));}},{"a":2,"n":"X","is":true,"t":4,"rt":UltimateJoystick.Axis,"sn":"X","box":function ($v) { return Bridge.box($v, UltimateJoystick.Axis, System.Enum.toStringFn(UltimateJoystick.Axis));}},{"a":2,"n":"Y","is":true,"t":4,"rt":UltimateJoystick.Axis,"sn":"Y","box":function ($v) { return Bridge.box($v, UltimateJoystick.Axis, System.Enum.toStringFn(UltimateJoystick.Axis));}}]}; }, $n);
    /*UltimateJoystick+Axis end.*/

    /*UltimateJoystick+Boundary start.*/
    $m("UltimateJoystick.Boundary", function () { return {"td":UltimateJoystick,"att":258,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"Circular","is":true,"t":4,"rt":UltimateJoystick.Boundary,"sn":"Circular","box":function ($v) { return Bridge.box($v, UltimateJoystick.Boundary, System.Enum.toStringFn(UltimateJoystick.Boundary));}},{"a":2,"n":"Square","is":true,"t":4,"rt":UltimateJoystick.Boundary,"sn":"Square","box":function ($v) { return Bridge.box($v, UltimateJoystick.Boundary, System.Enum.toStringFn(UltimateJoystick.Boundary));}}]}; }, $n);
    /*UltimateJoystick+Boundary end.*/

    /*UltimateJoystick+TapCountOption start.*/
    $m("UltimateJoystick.TapCountOption", function () { return {"td":UltimateJoystick,"att":258,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"Accumulate","is":true,"t":4,"rt":UltimateJoystick.TapCountOption,"sn":"Accumulate","box":function ($v) { return Bridge.box($v, UltimateJoystick.TapCountOption, System.Enum.toStringFn(UltimateJoystick.TapCountOption));}},{"a":2,"n":"NoCount","is":true,"t":4,"rt":UltimateJoystick.TapCountOption,"sn":"NoCount","box":function ($v) { return Bridge.box($v, UltimateJoystick.TapCountOption, System.Enum.toStringFn(UltimateJoystick.TapCountOption));}},{"a":2,"n":"TouchRelease","is":true,"t":4,"rt":UltimateJoystick.TapCountOption,"sn":"TouchRelease","box":function ($v) { return Bridge.box($v, UltimateJoystick.TapCountOption, System.Enum.toStringFn(UltimateJoystick.TapCountOption));}}]}; }, $n);
    /*UltimateJoystick+TapCountOption end.*/

    /*UltimateJoystick+TensionType start.*/
    $m("UltimateJoystick.TensionType", function () { return {"td":UltimateJoystick,"att":258,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"Directional","is":true,"t":4,"rt":UltimateJoystick.TensionType,"sn":"Directional","box":function ($v) { return Bridge.box($v, UltimateJoystick.TensionType, System.Enum.toStringFn(UltimateJoystick.TensionType));}},{"a":2,"n":"Free","is":true,"t":4,"rt":UltimateJoystick.TensionType,"sn":"Free","box":function ($v) { return Bridge.box($v, UltimateJoystick.TensionType, System.Enum.toStringFn(UltimateJoystick.TensionType));}}]}; }, $n);
    /*UltimateJoystick+TensionType end.*/

    /*UltimateJoystickScreenSizeUpdater start.*/
    $m("UltimateJoystickScreenSizeUpdater", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"ov":true,"a":3,"n":"OnRectTransformDimensionsChange","t":8,"sn":"OnRectTransformDimensionsChange","rt":$n[0].Void},{"a":1,"n":"YieldPositioning","t":8,"sn":"YieldPositioning","rt":$n[5].IEnumerator}]}; }, $n);
    /*UltimateJoystickScreenSizeUpdater end.*/

    /*IAmAnEmptyScriptJustToMakeCodelessProjectsCompileProperty start.*/
    $m("IAmAnEmptyScriptJustToMakeCodelessProjectsCompileProperty", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"}]}; }, $n);
    /*IAmAnEmptyScriptJustToMakeCodelessProjectsCompileProperty end.*/

    /*UltimateJoystickExample.Spaceship.AsteroidController start.*/
    $m("UltimateJoystickExample.Spaceship.AsteroidController", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"DelayInitialDestruction","t":8,"pi":[{"n":"delayTime","pt":$n[0].Single,"ps":0}],"sn":"DelayInitialDestruction","rt":$n[5].IEnumerator,"p":[$n[0].Single]},{"a":1,"n":"Explode","t":8,"sn":"Explode","rt":$n[0].Void},{"a":1,"n":"OnCollisionEnter","t":8,"pi":[{"n":"theCollision","pt":$n[1].Collision,"ps":0}],"sn":"OnCollisionEnter","rt":$n[0].Void,"p":[$n[1].Collision]},{"a":2,"n":"Setup","t":8,"pi":[{"n":"force","pt":$n[1].Vector3,"ps":0},{"n":"torque","pt":$n[1].Vector3,"ps":1}],"sn":"Setup","rt":$n[0].Void,"p":[$n[1].Vector3,$n[1].Vector3]},{"a":1,"n":"Update","t":8,"sn":"Update","rt":$n[0].Void},{"a":2,"n":"asteroidManager","t":4,"rt":$n[6].GameManager,"sn":"asteroidManager"},{"a":1,"n":"canDestroy","t":4,"rt":$n[0].Boolean,"sn":"canDestroy","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"isDebris","t":4,"rt":$n[0].Boolean,"sn":"isDebris","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":1,"n":"isDestroyed","t":4,"rt":$n[0].Boolean,"sn":"isDestroyed","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":1,"n":"myRigidbody","t":4,"rt":$n[1].Rigidbody,"sn":"myRigidbody"}]}; }, $n);
    /*UltimateJoystickExample.Spaceship.AsteroidController end.*/

    /*UltimateJoystickExample.Spaceship.GameManager start.*/
    $m("UltimateJoystickExample.Spaceship.GameManager", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"Awake","t":8,"sn":"Awake","rt":$n[0].Void},{"a":1,"n":"FadeDeathScreen","t":8,"sn":"FadeDeathScreen","rt":$n[5].IEnumerator},{"a":2,"n":"ModifyScore","t":8,"pi":[{"n":"isDebris","pt":$n[0].Boolean,"ps":0}],"sn":"ModifyScore","rt":$n[0].Void,"p":[$n[0].Boolean]},{"a":1,"n":"ShakeCamera","t":8,"sn":"ShakeCamera","rt":$n[5].IEnumerator},{"a":2,"n":"ShowDeathScreen","t":8,"sn":"ShowDeathScreen","rt":$n[0].Void},{"a":1,"n":"SpawnAsteroid","t":8,"sn":"SpawnAsteroid","rt":$n[0].Void},{"a":2,"n":"SpawnDebris","t":8,"pi":[{"n":"pos","pt":$n[1].Vector3,"ps":0}],"sn":"SpawnDebris","rt":$n[0].Void,"p":[$n[1].Vector3]},{"a":2,"n":"SpawnExplosion","t":8,"pi":[{"n":"pos","pt":$n[1].Vector3,"ps":0}],"sn":"SpawnExplosion","rt":$n[0].Void,"p":[$n[1].Vector3]},{"a":1,"n":"SpawnTimer","t":8,"sn":"SpawnTimer","rt":$n[5].IEnumerator},{"a":1,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void},{"a":1,"n":"UpdateScoreText","t":8,"sn":"UpdateScoreText","rt":$n[0].Void},{"a":2,"n":"Instance","is":true,"t":16,"rt":$n[6].GameManager,"g":{"a":2,"n":"get_Instance","t":8,"rt":$n[6].GameManager,"fg":"Instance","is":true},"fn":"Instance"},{"a":2,"n":"asteroidPoints","t":4,"rt":$n[0].Int32,"sn":"asteroidPoints","box":function ($v) { return Bridge.box($v, System.Int32);}},{"at":[new UnityEngine.HeaderAttribute("Prefabs")],"a":2,"n":"astroidPrefab","t":4,"rt":$n[1].GameObject,"sn":"astroidPrefab"},{"a":2,"n":"debrisPoints","t":4,"rt":$n[0].Int32,"sn":"debrisPoints","box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"debrisPrefab","t":4,"rt":$n[1].GameObject,"sn":"debrisPrefab"},{"a":2,"n":"explosionPrefab","t":4,"rt":$n[1].GameObject,"sn":"explosionPrefab"},{"at":[new UnityEngine.HeaderAttribute("Game Over")],"a":2,"n":"gameOverScreen","t":4,"rt":$n[2].Image,"sn":"gameOverScreen"},{"a":2,"n":"gameOverText","t":4,"rt":$n[2].Text,"sn":"gameOverText"},{"a":1,"n":"instance","is":true,"t":4,"rt":$n[6].GameManager,"sn":"instance"},{"a":2,"n":"playerExplosionPrefab","t":4,"rt":$n[1].GameObject,"sn":"playerExplosionPrefab"},{"a":1,"n":"score","t":4,"rt":$n[0].Int32,"sn":"score","box":function ($v) { return Bridge.box($v, System.Int32);}},{"at":[new UnityEngine.HeaderAttribute("Score")],"a":2,"n":"scoreText","t":4,"rt":$n[2].Text,"sn":"scoreText"},{"a":2,"n":"spawnTimeMax","t":4,"rt":$n[0].Single,"sn":"spawnTimeMax","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Spawning")],"a":2,"n":"spawnTimeMin","t":4,"rt":$n[0].Single,"sn":"spawnTimeMin","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"spawning","t":4,"rt":$n[0].Boolean,"sn":"spawning","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"startingAsteroids","t":4,"rt":$n[0].Int32,"sn":"startingAsteroids","box":function ($v) { return Bridge.box($v, System.Int32);}}]}; }, $n);
    /*UltimateJoystickExample.Spaceship.GameManager end.*/

    /*UltimateJoystickExample.Spaceship.PlayerController start.*/
    $m("UltimateJoystickExample.Spaceship.PlayerController", function () { return {"att":1048577,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"CheckExitScreen","t":8,"sn":"CheckExitScreen","rt":$n[0].Void},{"a":1,"n":"CreateBullets","t":8,"sn":"CreateBullets","rt":$n[0].Void},{"a":1,"n":"FixedUpdate","t":8,"sn":"FixedUpdate","rt":$n[0].Void},{"a":1,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void},{"a":1,"n":"Update","t":8,"sn":"Update","rt":$n[0].Void},{"a":2,"n":"accelerationSpeed","t":4,"rt":$n[0].Single,"sn":"accelerationSpeed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"at":[new UnityEngine.HeaderAttribute("Assigned Variables")],"a":2,"n":"bulletPrefab","t":4,"rt":$n[1].GameObject,"sn":"bulletPrefab"},{"a":2,"n":"bulletSpawnPos","t":4,"rt":$n[1].Transform,"sn":"bulletSpawnPos"},{"a":1,"n":"canControl","t":4,"rt":$n[0].Boolean,"sn":"canControl","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"gunTrans","t":4,"rt":$n[1].Transform,"sn":"gunTrans"},{"a":2,"n":"maxSpeed","t":4,"rt":$n[0].Single,"sn":"maxSpeed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"movePosition","t":4,"rt":$n[1].Vector3,"sn":"movePosition"},{"a":1,"n":"myRigidbody","t":4,"rt":$n[1].Rigidbody,"sn":"myRigidbody"},{"a":2,"n":"playerVisuals","t":4,"rt":$n[1].GameObject,"sn":"playerVisuals"},{"at":[new UnityEngine.HeaderAttribute("Speeds")],"a":2,"n":"rotationSpeed","t":4,"rt":$n[0].Single,"sn":"rotationSpeed","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"shootPosition","t":4,"rt":$n[1].Vector3,"sn":"shootPosition"},{"a":2,"n":"shootingCooldown","t":4,"rt":$n[0].Single,"sn":"shootingCooldown","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"shootingTimer","t":4,"rt":$n[0].Single,"sn":"shootingTimer","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}}]}; }, $n);
    /*UltimateJoystickExample.Spaceship.PlayerController end.*/

    /*DG.Tweening.DOTweenModuleAudio start.*/
    $m("DG.Tweening.DOTweenModuleAudio", function () { return {"att":1048961,"a":2,"s":true,"m":[{"a":2,"n":"DOComplete","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0},{"n":"withCallbacks","dv":false,"o":true,"pt":$n[0].Boolean,"ps":1}],"sn":"DOComplete","rt":$n[0].Int32,"p":[$n[7].AudioMixer,$n[0].Boolean],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DOFade","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].AudioSource,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOFade","rt":$n[8].TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions),"p":[$n[1].AudioSource,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOFlip","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0}],"sn":"DOFlip","rt":$n[0].Int32,"p":[$n[7].AudioMixer],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DOGoto","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0},{"n":"to","pt":$n[0].Single,"ps":1},{"n":"andPlay","dv":false,"o":true,"pt":$n[0].Boolean,"ps":2}],"sn":"DOGoto","rt":$n[0].Int32,"p":[$n[7].AudioMixer,$n[0].Single,$n[0].Boolean],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DOKill","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0},{"n":"complete","dv":false,"o":true,"pt":$n[0].Boolean,"ps":1}],"sn":"DOKill","rt":$n[0].Int32,"p":[$n[7].AudioMixer,$n[0].Boolean],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DOPause","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0}],"sn":"DOPause","rt":$n[0].Int32,"p":[$n[7].AudioMixer],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DOPitch","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].AudioSource,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOPitch","rt":$n[8].TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions),"p":[$n[1].AudioSource,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOPlay","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0}],"sn":"DOPlay","rt":$n[0].Int32,"p":[$n[7].AudioMixer],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DOPlayBackwards","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0}],"sn":"DOPlayBackwards","rt":$n[0].Int32,"p":[$n[7].AudioMixer],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DOPlayForward","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0}],"sn":"DOPlayForward","rt":$n[0].Int32,"p":[$n[7].AudioMixer],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DORestart","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0}],"sn":"DORestart","rt":$n[0].Int32,"p":[$n[7].AudioMixer],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DORewind","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0}],"sn":"DORewind","rt":$n[0].Int32,"p":[$n[7].AudioMixer],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DOSetFloat","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0},{"n":"floatName","pt":$n[0].String,"ps":1},{"n":"endValue","pt":$n[0].Single,"ps":2},{"n":"duration","pt":$n[0].Single,"ps":3}],"sn":"DOSetFloat","rt":$n[8].TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions),"p":[$n[7].AudioMixer,$n[0].String,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOSmoothRewind","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0}],"sn":"DOSmoothRewind","rt":$n[0].Int32,"p":[$n[7].AudioMixer],"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"DOTogglePause","is":true,"t":8,"pi":[{"n":"target","pt":$n[7].AudioMixer,"ps":0}],"sn":"DOTogglePause","rt":$n[0].Int32,"p":[$n[7].AudioMixer],"box":function ($v) { return Bridge.box($v, System.Int32);}}]}; }, $n);
    /*DG.Tweening.DOTweenModuleAudio end.*/

    /*DG.Tweening.DOTweenModulePhysics start.*/
    $m("DG.Tweening.DOTweenModulePhysics", function () { return {"att":1048961,"a":2,"s":true,"m":[{"a":2,"n":"DOJump","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"endValue","pt":$n[1].Vector3,"ps":1},{"n":"jumpPower","pt":$n[0].Single,"ps":2},{"n":"numJumps","pt":$n[0].Int32,"ps":3},{"n":"duration","pt":$n[0].Single,"ps":4},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":5}],"sn":"DOJump","rt":$n[9].Sequence,"p":[$n[1].Rigidbody,$n[1].Vector3,$n[0].Single,$n[0].Int32,$n[0].Single,$n[0].Boolean]},{"a":4,"n":"DOLocalPath","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"path","pt":$n[10].Path,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"pathMode","dv":1,"o":true,"pt":$n[9].PathMode,"ps":3}],"sn":"DOLocalPath$1","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions),"p":[$n[1].Rigidbody,$n[10].Path,$n[0].Single,$n[9].PathMode]},{"a":2,"n":"DOLocalPath","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"path","pt":System.Array.type(UnityEngine.Vector3),"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"pathType","dv":0,"o":true,"pt":$n[9].PathType,"ps":3},{"n":"pathMode","dv":1,"o":true,"pt":$n[9].PathMode,"ps":4},{"n":"resolution","dv":10,"o":true,"pt":$n[0].Int32,"ps":5},{"n":"gizmoColor","dv":null,"o":true,"pt":$n[0].Nullable$1(UnityEngine.Color),"ps":6}],"sn":"DOLocalPath","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions),"p":[$n[1].Rigidbody,System.Array.type(UnityEngine.Vector3),$n[0].Single,$n[9].PathType,$n[9].PathMode,$n[0].Int32,$n[0].Nullable$1(UnityEngine.Color)]},{"a":2,"n":"DOLookAt","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"towards","pt":$n[1].Vector3,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"axisConstraint","dv":0,"o":true,"pt":$n[9].AxisConstraint,"ps":3},{"n":"up","dv":null,"o":true,"pt":$n[0].Nullable$1(UnityEngine.Vector3),"ps":4}],"sn":"DOLookAt","rt":$n[8].TweenerCore$3(UnityEngine.Quaternion,UnityEngine.Vector3,DG.Tweening.Plugins.Options.QuaternionOptions),"p":[$n[1].Rigidbody,$n[1].Vector3,$n[0].Single,$n[9].AxisConstraint,$n[0].Nullable$1(UnityEngine.Vector3)]},{"a":2,"n":"DOMove","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"endValue","pt":$n[1].Vector3,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOMove","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].Rigidbody,$n[1].Vector3,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOMoveX","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOMoveX","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].Rigidbody,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOMoveY","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOMoveY","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].Rigidbody,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOMoveZ","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOMoveZ","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].Rigidbody,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":4,"n":"DOPath","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"path","pt":$n[10].Path,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"pathMode","dv":1,"o":true,"pt":$n[9].PathMode,"ps":3}],"sn":"DOPath$1","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions),"p":[$n[1].Rigidbody,$n[10].Path,$n[0].Single,$n[9].PathMode]},{"a":2,"n":"DOPath","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"path","pt":System.Array.type(UnityEngine.Vector3),"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"pathType","dv":0,"o":true,"pt":$n[9].PathType,"ps":3},{"n":"pathMode","dv":1,"o":true,"pt":$n[9].PathMode,"ps":4},{"n":"resolution","dv":10,"o":true,"pt":$n[0].Int32,"ps":5},{"n":"gizmoColor","dv":null,"o":true,"pt":$n[0].Nullable$1(UnityEngine.Color),"ps":6}],"sn":"DOPath","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions),"p":[$n[1].Rigidbody,System.Array.type(UnityEngine.Vector3),$n[0].Single,$n[9].PathType,$n[9].PathMode,$n[0].Int32,$n[0].Nullable$1(UnityEngine.Color)]},{"a":2,"n":"DORotate","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"endValue","pt":$n[1].Vector3,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"mode","dv":0,"o":true,"pt":$n[9].RotateMode,"ps":3}],"sn":"DORotate","rt":$n[8].TweenerCore$3(UnityEngine.Quaternion,UnityEngine.Vector3,DG.Tweening.Plugins.Options.QuaternionOptions),"p":[$n[1].Rigidbody,$n[1].Vector3,$n[0].Single,$n[9].RotateMode]}]}; }, $n);
    /*DG.Tweening.DOTweenModulePhysics end.*/

    /*DG.Tweening.DOTweenModulePhysics2D start.*/
    $m("DG.Tweening.DOTweenModulePhysics2D", function () { return {"att":1048961,"a":2,"s":true,"m":[{"a":2,"n":"DOJump","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody2D,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"jumpPower","pt":$n[0].Single,"ps":2},{"n":"numJumps","pt":$n[0].Int32,"ps":3},{"n":"duration","pt":$n[0].Single,"ps":4},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":5}],"sn":"DOJump","rt":$n[9].Sequence,"p":[$n[1].Rigidbody2D,$n[1].Vector2,$n[0].Single,$n[0].Int32,$n[0].Single,$n[0].Boolean]},{"a":4,"n":"DOLocalPath","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody2D,"ps":0},{"n":"path","pt":$n[10].Path,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"pathMode","dv":1,"o":true,"pt":$n[9].PathMode,"ps":3}],"sn":"DOLocalPath$1","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions),"p":[$n[1].Rigidbody2D,$n[10].Path,$n[0].Single,$n[9].PathMode]},{"a":2,"n":"DOLocalPath","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody2D,"ps":0},{"n":"path","pt":System.Array.type(UnityEngine.Vector2),"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"pathType","dv":0,"o":true,"pt":$n[9].PathType,"ps":3},{"n":"pathMode","dv":1,"o":true,"pt":$n[9].PathMode,"ps":4},{"n":"resolution","dv":10,"o":true,"pt":$n[0].Int32,"ps":5},{"n":"gizmoColor","dv":null,"o":true,"pt":$n[0].Nullable$1(UnityEngine.Color),"ps":6}],"sn":"DOLocalPath","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions),"p":[$n[1].Rigidbody2D,System.Array.type(UnityEngine.Vector2),$n[0].Single,$n[9].PathType,$n[9].PathMode,$n[0].Int32,$n[0].Nullable$1(UnityEngine.Color)]},{"a":2,"n":"DOMove","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody2D,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOMove","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].Rigidbody2D,$n[1].Vector2,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOMoveX","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody2D,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOMoveX","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].Rigidbody2D,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOMoveY","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody2D,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOMoveY","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].Rigidbody2D,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":4,"n":"DOPath","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody2D,"ps":0},{"n":"path","pt":$n[10].Path,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"pathMode","dv":1,"o":true,"pt":$n[9].PathMode,"ps":3}],"sn":"DOPath$1","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions),"p":[$n[1].Rigidbody2D,$n[10].Path,$n[0].Single,$n[9].PathMode]},{"a":2,"n":"DOPath","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody2D,"ps":0},{"n":"path","pt":System.Array.type(UnityEngine.Vector2),"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"pathType","dv":0,"o":true,"pt":$n[9].PathType,"ps":3},{"n":"pathMode","dv":1,"o":true,"pt":$n[9].PathMode,"ps":4},{"n":"resolution","dv":10,"o":true,"pt":$n[0].Int32,"ps":5},{"n":"gizmoColor","dv":null,"o":true,"pt":$n[0].Nullable$1(UnityEngine.Color),"ps":6}],"sn":"DOPath","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions),"p":[$n[1].Rigidbody2D,System.Array.type(UnityEngine.Vector2),$n[0].Single,$n[9].PathType,$n[9].PathMode,$n[0].Int32,$n[0].Nullable$1(UnityEngine.Color)]},{"a":2,"n":"DORotate","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody2D,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DORotate","rt":$n[8].TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions),"p":[$n[1].Rigidbody2D,$n[0].Single,$n[0].Single]}]}; }, $n);
    /*DG.Tweening.DOTweenModulePhysics2D end.*/

    /*DG.Tweening.DOTweenModuleSprite start.*/
    $m("DG.Tweening.DOTweenModuleSprite", function () { return {"att":1048961,"a":2,"s":true,"m":[{"a":2,"n":"DOBlendableColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].SpriteRenderer,"ps":0},{"n":"endValue","pt":$n[1].Color,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOBlendableColor","rt":$n[9].Tweener,"p":[$n[1].SpriteRenderer,$n[1].Color,$n[0].Single]},{"a":2,"n":"DOColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].SpriteRenderer,"ps":0},{"n":"endValue","pt":$n[1].Color,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOColor","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[1].SpriteRenderer,$n[1].Color,$n[0].Single]},{"a":2,"n":"DOFade","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].SpriteRenderer,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOFade","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[1].SpriteRenderer,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOGradientColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].SpriteRenderer,"ps":0},{"n":"gradient","pt":pc.ColorGradient,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOGradientColor","rt":$n[9].Sequence,"p":[$n[1].SpriteRenderer,pc.ColorGradient,$n[0].Single]}]}; }, $n);
    /*DG.Tweening.DOTweenModuleSprite end.*/

    /*DG.Tweening.DOTweenModuleUI start.*/
    $m("DG.Tweening.DOTweenModuleUI", function () { return {"nested":[$n[9].DOTweenModuleUI.Utils],"att":1048961,"a":2,"s":true,"m":[{"a":2,"n":"DOAnchorMax","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOAnchorMax","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[1].Vector2,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOAnchorMin","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOAnchorMin","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[1].Vector2,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOAnchorPos","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOAnchorPos","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[1].Vector2,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOAnchorPos3D","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[1].Vector3,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOAnchorPos3D","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[1].Vector3,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOAnchorPos3DX","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOAnchorPos3DX","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOAnchorPos3DY","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOAnchorPos3DY","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOAnchorPos3DZ","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOAnchorPos3DZ","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,UnityEngine.Vector3,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOAnchorPosX","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOAnchorPosX","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOAnchorPosY","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOAnchorPosY","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOBlendableColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Graphic,"ps":0},{"n":"endValue","pt":$n[1].Color,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOBlendableColor","rt":$n[9].Tweener,"p":[$n[2].Graphic,$n[1].Color,$n[0].Single]},{"a":2,"n":"DOBlendableColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Image,"ps":0},{"n":"endValue","pt":$n[1].Color,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOBlendableColor$1","rt":$n[9].Tweener,"p":[$n[2].Image,$n[1].Color,$n[0].Single]},{"a":2,"n":"DOBlendableColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Text,"ps":0},{"n":"endValue","pt":$n[1].Color,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOBlendableColor$2","rt":$n[9].Tweener,"p":[$n[2].Text,$n[1].Color,$n[0].Single]},{"a":2,"n":"DOColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Graphic,"ps":0},{"n":"endValue","pt":$n[1].Color,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOColor","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[2].Graphic,$n[1].Color,$n[0].Single]},{"a":2,"n":"DOColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Image,"ps":0},{"n":"endValue","pt":$n[1].Color,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOColor$1","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[2].Image,$n[1].Color,$n[0].Single]},{"a":2,"n":"DOColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Outline,"ps":0},{"n":"endValue","pt":$n[1].Color,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOColor$2","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[2].Outline,$n[1].Color,$n[0].Single]},{"a":2,"n":"DOColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Text,"ps":0},{"n":"endValue","pt":$n[1].Color,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOColor$3","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[2].Text,$n[1].Color,$n[0].Single]},{"a":2,"n":"DOCounter","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Text,"ps":0},{"n":"fromValue","pt":$n[0].Int32,"ps":1},{"n":"endValue","pt":$n[0].Int32,"ps":2},{"n":"duration","pt":$n[0].Single,"ps":3},{"n":"addThousandsSeparator","dv":true,"o":true,"pt":$n[0].Boolean,"ps":4},{"n":"culture","dv":null,"o":true,"pt":$n[11].CultureInfo,"ps":5}],"sn":"DOCounter","rt":$n[8].TweenerCore$3(System.Int32,System.Int32,DG.Tweening.Plugins.Options.NoOptions),"p":[$n[2].Text,$n[0].Int32,$n[0].Int32,$n[0].Single,$n[0].Boolean,$n[11].CultureInfo]},{"a":2,"n":"DOFade","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].CanvasGroup,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOFade","rt":$n[8].TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions),"p":[$n[1].CanvasGroup,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOFade","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Graphic,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOFade$1","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[2].Graphic,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOFade","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Image,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOFade$2","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[2].Image,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOFade","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Outline,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOFade$3","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[2].Outline,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOFade","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Text,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOFade$4","rt":$n[8].TweenerCore$3(UnityEngine.Color,UnityEngine.Color,DG.Tweening.Plugins.Options.ColorOptions),"p":[$n[2].Text,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOFillAmount","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Image,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOFillAmount","rt":$n[8].TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions),"p":[$n[2].Image,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOFlexibleSize","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].LayoutElement,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOFlexibleSize","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[2].LayoutElement,$n[1].Vector2,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOGradientColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Image,"ps":0},{"n":"gradient","pt":pc.ColorGradient,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOGradientColor","rt":$n[9].Sequence,"p":[$n[2].Image,pc.ColorGradient,$n[0].Single]},{"a":2,"n":"DOHorizontalNormalizedPos","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].ScrollRect,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOHorizontalNormalizedPos","rt":$n[9].Tweener,"p":[$n[2].ScrollRect,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOJumpAnchorPos","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"jumpPower","pt":$n[0].Single,"ps":2},{"n":"numJumps","pt":$n[0].Int32,"ps":3},{"n":"duration","pt":$n[0].Single,"ps":4},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":5}],"sn":"DOJumpAnchorPos","rt":$n[9].Sequence,"p":[$n[1].RectTransform,$n[1].Vector2,$n[0].Single,$n[0].Int32,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOMinSize","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].LayoutElement,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOMinSize","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[2].LayoutElement,$n[1].Vector2,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DONormalizedPos","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].ScrollRect,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DONormalizedPos","rt":$n[9].Tweener,"p":[$n[2].ScrollRect,$n[1].Vector2,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOPivot","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOPivot","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[1].Vector2,$n[0].Single]},{"a":2,"n":"DOPivotX","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOPivotX","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOPivotY","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOPivotY","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[0].Single,$n[0].Single]},{"a":2,"n":"DOPreferredSize","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].LayoutElement,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOPreferredSize","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[2].LayoutElement,$n[1].Vector2,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOPunchAnchorPos","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"punch","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"vibrato","dv":10,"o":true,"pt":$n[0].Int32,"ps":3},{"n":"elasticity","dv":1.0,"o":true,"pt":$n[0].Single,"ps":4},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":5}],"sn":"DOPunchAnchorPos","rt":$n[9].Tweener,"p":[$n[1].RectTransform,$n[1].Vector2,$n[0].Single,$n[0].Int32,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOScale","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Outline,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOScale","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[2].Outline,$n[1].Vector2,$n[0].Single]},{"a":2,"n":"DOShakeAnchorPos","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"duration","pt":$n[0].Single,"ps":1},{"n":"strength","dv":100.0,"o":true,"pt":$n[0].Single,"ps":2},{"n":"vibrato","dv":10,"o":true,"pt":$n[0].Int32,"ps":3},{"n":"randomness","dv":90.0,"o":true,"pt":$n[0].Single,"ps":4},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":5},{"n":"fadeOut","dv":true,"o":true,"pt":$n[0].Boolean,"ps":6},{"n":"randomnessMode","dv":0,"o":true,"pt":$n[9].ShakeRandomnessMode,"ps":7}],"sn":"DOShakeAnchorPos","rt":$n[9].Tweener,"p":[$n[1].RectTransform,$n[0].Single,$n[0].Single,$n[0].Int32,$n[0].Single,$n[0].Boolean,$n[0].Boolean,$n[9].ShakeRandomnessMode]},{"a":2,"n":"DOShakeAnchorPos","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"duration","pt":$n[0].Single,"ps":1},{"n":"strength","pt":$n[1].Vector2,"ps":2},{"n":"vibrato","dv":10,"o":true,"pt":$n[0].Int32,"ps":3},{"n":"randomness","dv":90.0,"o":true,"pt":$n[0].Single,"ps":4},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":5},{"n":"fadeOut","dv":true,"o":true,"pt":$n[0].Boolean,"ps":6},{"n":"randomnessMode","dv":0,"o":true,"pt":$n[9].ShakeRandomnessMode,"ps":7}],"sn":"DOShakeAnchorPos$1","rt":$n[9].Tweener,"p":[$n[1].RectTransform,$n[0].Single,$n[1].Vector2,$n[0].Int32,$n[0].Single,$n[0].Boolean,$n[0].Boolean,$n[9].ShakeRandomnessMode]},{"a":2,"n":"DOShapeCircle","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"center","pt":$n[1].Vector2,"ps":1},{"n":"endValueDegrees","pt":$n[0].Single,"ps":2},{"n":"duration","pt":$n[0].Single,"ps":3},{"n":"relativeCenter","dv":false,"o":true,"pt":$n[0].Boolean,"ps":4},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":5}],"sn":"DOShapeCircle","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.CircleOptions),"p":[$n[1].RectTransform,$n[1].Vector2,$n[0].Single,$n[0].Single,$n[0].Boolean,$n[0].Boolean]},{"a":2,"n":"DOSizeDelta","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].RectTransform,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOSizeDelta","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].RectTransform,$n[1].Vector2,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOText","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Text,"ps":0},{"n":"endValue","pt":$n[0].String,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"richTextEnabled","dv":true,"o":true,"pt":$n[0].Boolean,"ps":3},{"n":"scrambleMode","dv":0,"o":true,"pt":$n[9].ScrambleMode,"ps":4},{"n":"scrambleChars","dv":null,"o":true,"pt":$n[0].String,"ps":5}],"sn":"DOText","rt":$n[8].TweenerCore$3(System.String,System.String,DG.Tweening.Plugins.Options.StringOptions),"p":[$n[2].Text,$n[0].String,$n[0].Single,$n[0].Boolean,$n[9].ScrambleMode,$n[0].String]},{"a":2,"n":"DOValue","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].Slider,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOValue","rt":$n[8].TweenerCore$3(System.Single,System.Single,DG.Tweening.Plugins.Options.FloatOptions),"p":[$n[2].Slider,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOVerticalNormalizedPos","is":true,"t":8,"pi":[{"n":"target","pt":$n[2].ScrollRect,"ps":0},{"n":"endValue","pt":$n[0].Single,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":3}],"sn":"DOVerticalNormalizedPos","rt":$n[9].Tweener,"p":[$n[2].ScrollRect,$n[0].Single,$n[0].Single,$n[0].Boolean]}]}; }, $n);
    /*DG.Tweening.DOTweenModuleUI end.*/

    /*DG.Tweening.DOTweenModuleUI+Utils start.*/
    $m("DG.Tweening.DOTweenModuleUI.Utils", function () { return {"td":$n[9].DOTweenModuleUI,"att":1048962,"a":2,"s":true,"m":[{"a":2,"n":"SwitchToRectTransform","is":true,"t":8,"pi":[{"n":"from","pt":$n[1].RectTransform,"ps":0},{"n":"to","pt":$n[1].RectTransform,"ps":1}],"sn":"SwitchToRectTransform","rt":$n[1].Vector2,"p":[$n[1].RectTransform,$n[1].RectTransform]}]}; }, $n);
    /*DG.Tweening.DOTweenModuleUI+Utils end.*/

    /*DG.Tweening.DOTweenModuleUnityVersion start.*/
    $m("DG.Tweening.DOTweenModuleUnityVersion", function () { return {"att":1048961,"a":2,"s":true,"m":[{"a":2,"n":"DOGradientColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Material,"ps":0},{"n":"gradient","pt":pc.ColorGradient,"ps":1},{"n":"duration","pt":$n[0].Single,"ps":2}],"sn":"DOGradientColor","rt":$n[9].Sequence,"p":[$n[1].Material,pc.ColorGradient,$n[0].Single]},{"a":2,"n":"DOGradientColor","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Material,"ps":0},{"n":"gradient","pt":pc.ColorGradient,"ps":1},{"n":"property","pt":$n[0].String,"ps":2},{"n":"duration","pt":$n[0].Single,"ps":3}],"sn":"DOGradientColor$1","rt":$n[9].Sequence,"p":[$n[1].Material,pc.ColorGradient,$n[0].String,$n[0].Single]},{"a":2,"n":"DOOffset","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Material,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"propertyID","pt":$n[0].Int32,"ps":2},{"n":"duration","pt":$n[0].Single,"ps":3}],"sn":"DOOffset","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].Material,$n[1].Vector2,$n[0].Int32,$n[0].Single]},{"a":2,"n":"DOTiling","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Material,"ps":0},{"n":"endValue","pt":$n[1].Vector2,"ps":1},{"n":"propertyID","pt":$n[0].Int32,"ps":2},{"n":"duration","pt":$n[0].Single,"ps":3}],"sn":"DOTiling","rt":$n[8].TweenerCore$3(UnityEngine.Vector2,UnityEngine.Vector2,DG.Tweening.Plugins.Options.VectorOptions),"p":[$n[1].Material,$n[1].Vector2,$n[0].Int32,$n[0].Single]},{"a":2,"n":"WaitForCompletion","is":true,"t":8,"pi":[{"n":"t","pt":$n[9].Tween,"ps":0},{"n":"returnCustomYieldInstruction","pt":$n[0].Boolean,"ps":1}],"sn":"WaitForCompletion","rt":$n[1].CustomYieldInstruction,"p":[$n[9].Tween,$n[0].Boolean]},{"a":2,"n":"WaitForElapsedLoops","is":true,"t":8,"pi":[{"n":"t","pt":$n[9].Tween,"ps":0},{"n":"elapsedLoops","pt":$n[0].Int32,"ps":1},{"n":"returnCustomYieldInstruction","pt":$n[0].Boolean,"ps":2}],"sn":"WaitForElapsedLoops","rt":$n[1].CustomYieldInstruction,"p":[$n[9].Tween,$n[0].Int32,$n[0].Boolean]},{"a":2,"n":"WaitForKill","is":true,"t":8,"pi":[{"n":"t","pt":$n[9].Tween,"ps":0},{"n":"returnCustomYieldInstruction","pt":$n[0].Boolean,"ps":1}],"sn":"WaitForKill","rt":$n[1].CustomYieldInstruction,"p":[$n[9].Tween,$n[0].Boolean]},{"a":2,"n":"WaitForPosition","is":true,"t":8,"pi":[{"n":"t","pt":$n[9].Tween,"ps":0},{"n":"position","pt":$n[0].Single,"ps":1},{"n":"returnCustomYieldInstruction","pt":$n[0].Boolean,"ps":2}],"sn":"WaitForPosition","rt":$n[1].CustomYieldInstruction,"p":[$n[9].Tween,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"WaitForRewind","is":true,"t":8,"pi":[{"n":"t","pt":$n[9].Tween,"ps":0},{"n":"returnCustomYieldInstruction","pt":$n[0].Boolean,"ps":1}],"sn":"WaitForRewind","rt":$n[1].CustomYieldInstruction,"p":[$n[9].Tween,$n[0].Boolean]},{"a":2,"n":"WaitForStart","is":true,"t":8,"pi":[{"n":"t","pt":$n[9].Tween,"ps":0},{"n":"returnCustomYieldInstruction","pt":$n[0].Boolean,"ps":1}],"sn":"WaitForStart","rt":$n[1].CustomYieldInstruction,"p":[$n[9].Tween,$n[0].Boolean]}]}; }, $n);
    /*DG.Tweening.DOTweenModuleUnityVersion end.*/

    /*DG.Tweening.DOTweenCYInstruction start.*/
    $m("DG.Tweening.DOTweenCYInstruction", function () { return {"nested":[$n[9].DOTweenCYInstruction.WaitForCompletion,$n[9].DOTweenCYInstruction.WaitForRewind,$n[9].DOTweenCYInstruction.WaitForKill,$n[9].DOTweenCYInstruction.WaitForElapsedLoops,$n[9].DOTweenCYInstruction.WaitForPosition,$n[9].DOTweenCYInstruction.WaitForStart],"att":1048961,"a":2,"s":true}; }, $n);
    /*DG.Tweening.DOTweenCYInstruction end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForCompletion start.*/
    $m("DG.Tweening.DOTweenCYInstruction.WaitForCompletion", function () { return {"td":$n[9].DOTweenCYInstruction,"att":1048578,"a":2,"m":[{"a":2,"n":".ctor","t":1,"p":[$n[9].Tween],"pi":[{"n":"tween","pt":$n[9].Tween,"ps":0}],"sn":"ctor"},{"ov":true,"a":2,"n":"keepWaiting","t":16,"rt":$n[0].Boolean,"g":{"ov":true,"a":2,"n":"get_keepWaiting","t":8,"rt":$n[0].Boolean,"fg":"keepWaiting","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"fn":"keepWaiting"},{"a":1,"n":"t","t":4,"rt":$n[9].Tween,"sn":"t","ro":true}]}; }, $n);
    /*DG.Tweening.DOTweenCYInstruction+WaitForCompletion end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForRewind start.*/
    $m("DG.Tweening.DOTweenCYInstruction.WaitForRewind", function () { return {"td":$n[9].DOTweenCYInstruction,"att":1048578,"a":2,"m":[{"a":2,"n":".ctor","t":1,"p":[$n[9].Tween],"pi":[{"n":"tween","pt":$n[9].Tween,"ps":0}],"sn":"ctor"},{"ov":true,"a":2,"n":"keepWaiting","t":16,"rt":$n[0].Boolean,"g":{"ov":true,"a":2,"n":"get_keepWaiting","t":8,"rt":$n[0].Boolean,"fg":"keepWaiting","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"fn":"keepWaiting"},{"a":1,"n":"t","t":4,"rt":$n[9].Tween,"sn":"t","ro":true}]}; }, $n);
    /*DG.Tweening.DOTweenCYInstruction+WaitForRewind end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForKill start.*/
    $m("DG.Tweening.DOTweenCYInstruction.WaitForKill", function () { return {"td":$n[9].DOTweenCYInstruction,"att":1048578,"a":2,"m":[{"a":2,"n":".ctor","t":1,"p":[$n[9].Tween],"pi":[{"n":"tween","pt":$n[9].Tween,"ps":0}],"sn":"ctor"},{"ov":true,"a":2,"n":"keepWaiting","t":16,"rt":$n[0].Boolean,"g":{"ov":true,"a":2,"n":"get_keepWaiting","t":8,"rt":$n[0].Boolean,"fg":"keepWaiting","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"fn":"keepWaiting"},{"a":1,"n":"t","t":4,"rt":$n[9].Tween,"sn":"t","ro":true}]}; }, $n);
    /*DG.Tweening.DOTweenCYInstruction+WaitForKill end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForElapsedLoops start.*/
    $m("DG.Tweening.DOTweenCYInstruction.WaitForElapsedLoops", function () { return {"td":$n[9].DOTweenCYInstruction,"att":1048578,"a":2,"m":[{"a":2,"n":".ctor","t":1,"p":[$n[9].Tween,$n[0].Int32],"pi":[{"n":"tween","pt":$n[9].Tween,"ps":0},{"n":"elapsedLoops","pt":$n[0].Int32,"ps":1}],"sn":"ctor"},{"ov":true,"a":2,"n":"keepWaiting","t":16,"rt":$n[0].Boolean,"g":{"ov":true,"a":2,"n":"get_keepWaiting","t":8,"rt":$n[0].Boolean,"fg":"keepWaiting","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"fn":"keepWaiting"},{"a":1,"n":"elapsedLoops","t":4,"rt":$n[0].Int32,"sn":"elapsedLoops","ro":true,"box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":1,"n":"t","t":4,"rt":$n[9].Tween,"sn":"t","ro":true}]}; }, $n);
    /*DG.Tweening.DOTweenCYInstruction+WaitForElapsedLoops end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForPosition start.*/
    $m("DG.Tweening.DOTweenCYInstruction.WaitForPosition", function () { return {"td":$n[9].DOTweenCYInstruction,"att":1048578,"a":2,"m":[{"a":2,"n":".ctor","t":1,"p":[$n[9].Tween,$n[0].Single],"pi":[{"n":"tween","pt":$n[9].Tween,"ps":0},{"n":"position","pt":$n[0].Single,"ps":1}],"sn":"ctor"},{"ov":true,"a":2,"n":"keepWaiting","t":16,"rt":$n[0].Boolean,"g":{"ov":true,"a":2,"n":"get_keepWaiting","t":8,"rt":$n[0].Boolean,"fg":"keepWaiting","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"fn":"keepWaiting"},{"a":1,"n":"position","t":4,"rt":$n[0].Single,"sn":"position","ro":true,"box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":1,"n":"t","t":4,"rt":$n[9].Tween,"sn":"t","ro":true}]}; }, $n);
    /*DG.Tweening.DOTweenCYInstruction+WaitForPosition end.*/

    /*DG.Tweening.DOTweenCYInstruction+WaitForStart start.*/
    $m("DG.Tweening.DOTweenCYInstruction.WaitForStart", function () { return {"td":$n[9].DOTweenCYInstruction,"att":1048578,"a":2,"m":[{"a":2,"n":".ctor","t":1,"p":[$n[9].Tween],"pi":[{"n":"tween","pt":$n[9].Tween,"ps":0}],"sn":"ctor"},{"ov":true,"a":2,"n":"keepWaiting","t":16,"rt":$n[0].Boolean,"g":{"ov":true,"a":2,"n":"get_keepWaiting","t":8,"rt":$n[0].Boolean,"fg":"keepWaiting","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},"fn":"keepWaiting"},{"a":1,"n":"t","t":4,"rt":$n[9].Tween,"sn":"t","ro":true}]}; }, $n);
    /*DG.Tweening.DOTweenCYInstruction+WaitForStart end.*/

    /*DG.Tweening.DOTweenModuleUtils start.*/
    $m("DG.Tweening.DOTweenModuleUtils", function () { return {"nested":[$n[9].DOTweenModuleUtils.Physics],"att":1048961,"a":2,"s":true,"m":[{"at":[new UnityEngine.Scripting.PreserveAttribute()],"a":2,"n":"Init","is":true,"t":8,"sn":"Init","rt":$n[0].Void},{"at":[new UnityEngine.Scripting.PreserveAttribute()],"a":1,"n":"Preserver","is":true,"t":8,"sn":"Preserver","rt":$n[0].Void},{"a":1,"n":"_initialized","is":true,"t":4,"rt":$n[0].Boolean,"sn":"_initialized","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}}]}; }, $n);
    /*DG.Tweening.DOTweenModuleUtils end.*/

    /*DG.Tweening.DOTweenModuleUtils+Physics start.*/
    $m("DG.Tweening.DOTweenModuleUtils.Physics", function () { return {"td":$n[9].DOTweenModuleUtils,"att":1048962,"a":2,"s":true,"m":[{"at":[new UnityEngine.Scripting.PreserveAttribute()],"a":2,"n":"CreateDOTweenPathTween","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].MonoBehaviour,"ps":0},{"n":"tweenRigidbody","pt":$n[0].Boolean,"ps":1},{"n":"isLocal","pt":$n[0].Boolean,"ps":2},{"n":"path","pt":$n[10].Path,"ps":3},{"n":"duration","pt":$n[0].Single,"ps":4},{"n":"pathMode","pt":$n[9].PathMode,"ps":5}],"sn":"CreateDOTweenPathTween","rt":$n[8].TweenerCore$3(UnityEngine.Vector3,DG.Tweening.Plugins.Core.PathCore.Path,DG.Tweening.Plugins.Options.PathOptions),"p":[$n[1].MonoBehaviour,$n[0].Boolean,$n[0].Boolean,$n[10].Path,$n[0].Single,$n[9].PathMode]},{"at":[new UnityEngine.Scripting.PreserveAttribute()],"a":2,"n":"HasRigidbody","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Component,"ps":0}],"sn":"HasRigidbody","rt":$n[0].Boolean,"p":[$n[1].Component],"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"HasRigidbody2D","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Component,"ps":0}],"sn":"HasRigidbody2D","rt":$n[0].Boolean,"p":[$n[1].Component],"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"SetOrientationOnPath","is":true,"t":8,"pi":[{"n":"options","pt":$n[12].PathOptions,"ps":0},{"n":"t","pt":$n[9].Tween,"ps":1},{"n":"newRot","pt":$n[1].Quaternion,"ps":2},{"n":"trans","pt":$n[1].Transform,"ps":3}],"sn":"SetOrientationOnPath","rt":$n[0].Void,"p":[$n[12].PathOptions,$n[9].Tween,$n[1].Quaternion,$n[1].Transform]}]}; }, $n);
    /*DG.Tweening.DOTweenModuleUtils+Physics end.*/

    /*DG.Tweening.DOTweenAnimation start.*/
    $m("DG.Tweening.DOTweenAnimation", function () { return {"nested":[$n[9].DOTweenAnimation.AnimationType,$n[9].DOTweenAnimation.TargetType],"att":1048577,"a":2,"at":[new UnityEngine.AddComponentMenu.ctor("DOTween/DOTween Animation")],"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":1,"n":"Awake","t":8,"sn":"Awake","rt":$n[0].Void},{"a":2,"n":"CreateEditorPreview","t":8,"sn":"CreateEditorPreview","rt":$n[9].Tween},{"a":2,"n":"CreateTween","t":8,"pi":[{"n":"regenerateIfExists","dv":false,"o":true,"pt":$n[0].Boolean,"ps":0},{"n":"andPlay","dv":true,"o":true,"pt":$n[0].Boolean,"ps":1}],"sn":"CreateTween","rt":$n[0].Void,"p":[$n[0].Boolean,$n[0].Boolean]},{"ov":true,"a":2,"n":"DOComplete","t":8,"sn":"DOComplete","rt":$n[0].Void},{"ov":true,"a":2,"n":"DOKill","t":8,"sn":"DOKill","rt":$n[0].Void},{"a":2,"n":"DOKillAllById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DOKillAllById","rt":$n[0].Void,"p":[$n[0].String]},{"a":2,"n":"DOKillById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DOKillById","rt":$n[0].Void,"p":[$n[0].String]},{"ov":true,"a":2,"n":"DOPause","t":8,"sn":"DOPause","rt":$n[0].Void},{"a":2,"n":"DOPauseAllById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DOPauseAllById","rt":$n[0].Void,"p":[$n[0].String]},{"ov":true,"a":2,"n":"DOPlay","t":8,"sn":"DOPlay","rt":$n[0].Void},{"a":2,"n":"DOPlayAllById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DOPlayAllById","rt":$n[0].Void,"p":[$n[0].String]},{"ov":true,"a":2,"n":"DOPlayBackwards","t":8,"sn":"DOPlayBackwards","rt":$n[0].Void},{"a":2,"n":"DOPlayBackwardsAllById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DOPlayBackwardsAllById","rt":$n[0].Void,"p":[$n[0].String]},{"a":2,"n":"DOPlayBackwardsById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DOPlayBackwardsById","rt":$n[0].Void,"p":[$n[0].String]},{"a":2,"n":"DOPlayById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DOPlayById","rt":$n[0].Void,"p":[$n[0].String]},{"ov":true,"a":2,"n":"DOPlayForward","t":8,"sn":"DOPlayForward","rt":$n[0].Void},{"a":2,"n":"DOPlayForwardAllById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DOPlayForwardAllById","rt":$n[0].Void,"p":[$n[0].String]},{"a":2,"n":"DOPlayForwardById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DOPlayForwardById","rt":$n[0].Void,"p":[$n[0].String]},{"a":2,"n":"DOPlayNext","t":8,"sn":"DOPlayNext","rt":$n[0].Void},{"ov":true,"a":2,"n":"DORestart","t":8,"sn":"DORestart","rt":$n[0].Void},{"ov":true,"a":2,"n":"DORestart","t":8,"pi":[{"n":"fromHere","pt":$n[0].Boolean,"ps":0}],"sn":"DORestart$1","rt":$n[0].Void,"p":[$n[0].Boolean]},{"a":2,"n":"DORestartAllById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DORestartAllById","rt":$n[0].Void,"p":[$n[0].String]},{"a":2,"n":"DORestartById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DORestartById","rt":$n[0].Void,"p":[$n[0].String]},{"ov":true,"a":2,"n":"DORewind","t":8,"sn":"DORewind","rt":$n[0].Void},{"a":2,"n":"DORewindAllById","t":8,"pi":[{"n":"id","pt":$n[0].String,"ps":0}],"sn":"DORewindAllById","rt":$n[0].Void,"p":[$n[0].String]},{"a":2,"n":"DORewindAndPlayNext","t":8,"sn":"DORewindAndPlayNext","rt":$n[0].Void},{"ov":true,"a":2,"n":"DOTogglePause","t":8,"sn":"DOTogglePause","rt":$n[0].Void},{"a":1,"n":"Dispatch_OnReset","is":true,"t":8,"pi":[{"n":"anim","pt":$n[9].DOTweenAnimation,"ps":0}],"sn":"Dispatch_OnReset","rt":$n[0].Void,"p":[$n[9].DOTweenAnimation]},{"a":1,"n":"GetTweenGO","t":8,"sn":"GetTweenGO","rt":$n[1].GameObject},{"a":1,"n":"GetTweenTarget","t":8,"sn":"GetTweenTarget","rt":$n[1].GameObject},{"a":2,"n":"GetTweens","t":8,"sn":"GetTweens","rt":$n[4].List$1(DG.Tweening.Tween)},{"a":1,"n":"OnDestroy","t":8,"sn":"OnDestroy","rt":$n[0].Void},{"a":1,"n":"ReEvaluateRelativeTween","t":8,"sn":"ReEvaluateRelativeTween","rt":$n[0].Void},{"a":2,"n":"RecreateTween","t":8,"sn":"RecreateTween","rt":$n[0].Void},{"a":2,"n":"RecreateTweenAndPlay","t":8,"sn":"RecreateTweenAndPlay","rt":$n[0].Void},{"a":1,"n":"Reset","t":8,"sn":"Reset","rt":$n[0].Void},{"a":2,"n":"RewindThenRecreateTween","t":8,"sn":"RewindThenRecreateTween","rt":$n[0].Void},{"a":2,"n":"RewindThenRecreateTweenAndPlay","t":8,"sn":"RewindThenRecreateTweenAndPlay","rt":$n[0].Void},{"a":2,"n":"SetAnimationTarget","t":8,"pi":[{"n":"tweenTarget","pt":$n[1].Component,"ps":0},{"n":"useTweenTargetGameObjectForGroupOperations","dv":true,"o":true,"pt":$n[0].Boolean,"ps":1}],"sn":"SetAnimationTarget","rt":$n[0].Void,"p":[$n[1].Component,$n[0].Boolean]},{"a":1,"n":"Start","t":8,"sn":"Start","rt":$n[0].Void},{"a":2,"n":"TypeToDOTargetType","is":true,"t":8,"pi":[{"n":"t","pt":$n[0].Type,"ps":0}],"sn":"TypeToDOTargetType","rt":$n[9].DOTweenAnimation.TargetType,"p":[$n[0].Type],"box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":1,"n":"_playCount","t":4,"rt":$n[0].Int32,"sn":"_playCount","box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":1,"n":"_tweenAutoGenerationCalled","t":4,"rt":$n[0].Boolean,"sn":"_tweenAutoGenerationCalled","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"animationType","t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"animationType","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"autoGenerate","t":4,"rt":$n[0].Boolean,"sn":"autoGenerate","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"autoKill","t":4,"rt":$n[0].Boolean,"sn":"autoKill","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"autoPlay","t":4,"rt":$n[0].Boolean,"sn":"autoPlay","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"delay","t":4,"rt":$n[0].Single,"sn":"delay","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"duration","t":4,"rt":$n[0].Single,"sn":"duration","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"easeCurve","t":4,"rt":pc.AnimationCurve,"sn":"easeCurve"},{"a":2,"n":"easeType","t":4,"rt":$n[9].Ease,"sn":"easeType","box":function ($v) { return Bridge.box($v, DG.Tweening.Ease, System.Enum.toStringFn(DG.Tweening.Ease));}},{"a":2,"n":"endValueColor","t":4,"rt":$n[1].Color,"sn":"endValueColor"},{"a":2,"n":"endValueFloat","t":4,"rt":$n[0].Single,"sn":"endValueFloat","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"endValueRect","t":4,"rt":$n[1].Rect,"sn":"endValueRect"},{"a":2,"n":"endValueString","t":4,"rt":$n[0].String,"sn":"endValueString"},{"a":2,"n":"endValueTransform","t":4,"rt":$n[1].Transform,"sn":"endValueTransform"},{"a":2,"n":"endValueV2","t":4,"rt":$n[1].Vector2,"sn":"endValueV2"},{"a":2,"n":"endValueV3","t":4,"rt":$n[1].Vector3,"sn":"endValueV3"},{"a":2,"n":"forcedTargetType","t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"forcedTargetType","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"id","t":4,"rt":$n[0].String,"sn":"id"},{"a":2,"n":"isActive","t":4,"rt":$n[0].Boolean,"sn":"isActive","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"isFrom","t":4,"rt":$n[0].Boolean,"sn":"isFrom","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"isIndependentUpdate","t":4,"rt":$n[0].Boolean,"sn":"isIndependentUpdate","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"isRelative","t":4,"rt":$n[0].Boolean,"sn":"isRelative","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"isValid","t":4,"rt":$n[0].Boolean,"sn":"isValid","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"loopType","t":4,"rt":$n[9].LoopType,"sn":"loopType","box":function ($v) { return Bridge.box($v, DG.Tweening.LoopType, System.Enum.toStringFn(DG.Tweening.LoopType));}},{"a":2,"n":"loops","t":4,"rt":$n[0].Int32,"sn":"loops","box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"optionalBool0","t":4,"rt":$n[0].Boolean,"sn":"optionalBool0","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"optionalBool1","t":4,"rt":$n[0].Boolean,"sn":"optionalBool1","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"optionalFloat0","t":4,"rt":$n[0].Single,"sn":"optionalFloat0","box":function ($v) { return Bridge.box($v, System.Single, System.Single.format, System.Single.getHashCode);}},{"a":2,"n":"optionalInt0","t":4,"rt":$n[0].Int32,"sn":"optionalInt0","box":function ($v) { return Bridge.box($v, System.Int32);}},{"a":2,"n":"optionalRotationMode","t":4,"rt":$n[9].RotateMode,"sn":"optionalRotationMode","box":function ($v) { return Bridge.box($v, DG.Tweening.RotateMode, System.Enum.toStringFn(DG.Tweening.RotateMode));}},{"a":2,"n":"optionalScrambleMode","t":4,"rt":$n[9].ScrambleMode,"sn":"optionalScrambleMode","box":function ($v) { return Bridge.box($v, DG.Tweening.ScrambleMode, System.Enum.toStringFn(DG.Tweening.ScrambleMode));}},{"a":2,"n":"optionalShakeRandomnessMode","t":4,"rt":$n[9].ShakeRandomnessMode,"sn":"optionalShakeRandomnessMode","box":function ($v) { return Bridge.box($v, DG.Tweening.ShakeRandomnessMode, System.Enum.toStringFn(DG.Tweening.ShakeRandomnessMode));}},{"a":2,"n":"optionalString","t":4,"rt":$n[0].String,"sn":"optionalString"},{"a":2,"n":"target","t":4,"rt":$n[1].Component,"sn":"target"},{"a":2,"n":"targetGO","t":4,"rt":$n[1].GameObject,"sn":"targetGO"},{"a":2,"n":"targetIsSelf","t":4,"rt":$n[0].Boolean,"sn":"targetIsSelf","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"targetType","t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"targetType","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"tweenTargetIsTargetGO","t":4,"rt":$n[0].Boolean,"sn":"tweenTargetIsTargetGO","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"useTargetAsV3","t":4,"rt":$n[0].Boolean,"sn":"useTargetAsV3","box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}},{"a":2,"n":"OnReset","is":true,"t":2,"ad":{"a":2,"n":"add_OnReset","is":true,"t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"addOnReset","rt":$n[0].Void,"p":[Function]},"r":{"a":2,"n":"remove_OnReset","is":true,"t":8,"pi":[{"n":"value","pt":Function,"ps":0}],"sn":"removeOnReset","rt":$n[0].Void,"p":[Function]}}]}; }, $n);
    /*DG.Tweening.DOTweenAnimation end.*/

    /*DG.Tweening.DOTweenAnimation+AnimationType start.*/
    $m("DG.Tweening.DOTweenAnimation.AnimationType", function () { return {"td":$n[9].DOTweenAnimation,"att":258,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"CameraAspect","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"CameraAspect","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"CameraBackgroundColor","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"CameraBackgroundColor","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"CameraFieldOfView","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"CameraFieldOfView","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"CameraOrthoSize","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"CameraOrthoSize","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"CameraPixelRect","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"CameraPixelRect","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"CameraRect","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"CameraRect","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"Color","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"Color","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"Fade","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"Fade","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"LocalMove","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"LocalMove","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"LocalRotate","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"LocalRotate","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"Move","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"Move","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"None","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"None","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"PunchPosition","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"PunchPosition","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"PunchRotation","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"PunchRotation","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"PunchScale","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"PunchScale","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"Rotate","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"Rotate","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"Scale","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"Scale","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"ShakePosition","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"ShakePosition","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"ShakeRotation","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"ShakeRotation","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"ShakeScale","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"ShakeScale","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"Text","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"Text","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}},{"a":2,"n":"UIWidthHeight","is":true,"t":4,"rt":$n[9].DOTweenAnimation.AnimationType,"sn":"UIWidthHeight","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.AnimationType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.AnimationType));}}]}; }, $n);
    /*DG.Tweening.DOTweenAnimation+AnimationType end.*/

    /*DG.Tweening.DOTweenAnimation+TargetType start.*/
    $m("DG.Tweening.DOTweenAnimation.TargetType", function () { return {"td":$n[9].DOTweenAnimation,"att":258,"a":2,"m":[{"a":2,"isSynthetic":true,"n":".ctor","t":1,"sn":"ctor"},{"a":2,"n":"Camera","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"Camera","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"CanvasGroup","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"CanvasGroup","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"Image","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"Image","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"Light","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"Light","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"RectTransform","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"RectTransform","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"Renderer","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"Renderer","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"Rigidbody","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"Rigidbody","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"Rigidbody2D","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"Rigidbody2D","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"SpriteRenderer","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"SpriteRenderer","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"Text","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"Text","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"TextMeshPro","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"TextMeshPro","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"TextMeshProUGUI","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"TextMeshProUGUI","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"Transform","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"Transform","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"Unset","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"Unset","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"tk2dBaseSprite","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"tk2dBaseSprite","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}},{"a":2,"n":"tk2dTextMesh","is":true,"t":4,"rt":$n[9].DOTweenAnimation.TargetType,"sn":"tk2dTextMesh","box":function ($v) { return Bridge.box($v, DG.Tweening.DOTweenAnimation.TargetType, System.Enum.toStringFn(DG.Tweening.DOTweenAnimation.TargetType));}}]}; }, $n);
    /*DG.Tweening.DOTweenAnimation+TargetType end.*/

    /*DG.Tweening.DOTweenAnimationExtensions start.*/
    $m("DG.Tweening.DOTweenAnimationExtensions", function () { return {"att":1048961,"a":2,"s":true,"m":[{"a":2,"n":"IsSameOrSubclassOf","is":true,"t":8,"pi":[{"n":"t","pt":$n[1].Component,"ps":0}],"tpc":1,"tprm":["T"],"sn":"IsSameOrSubclassOf","rt":$n[0].Boolean,"p":[$n[1].Component],"box":function ($v) { return Bridge.box($v, System.Boolean, System.Boolean.toString);}}]}; }, $n);
    /*DG.Tweening.DOTweenAnimationExtensions end.*/

    /*DG.Tweening.DOTweenProShortcuts start.*/
    $m("DG.Tweening.DOTweenProShortcuts", function () { return {"att":385,"a":2,"s":true,"m":[{"n":".cctor","t":1,"sn":"ctor","sm":true},{"a":2,"n":"DOSpiral","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Rigidbody,"ps":0},{"n":"duration","pt":$n[0].Single,"ps":1},{"n":"axis","dv":null,"o":true,"pt":$n[0].Nullable$1(UnityEngine.Vector3),"ps":2},{"n":"mode","dv":0,"o":true,"pt":$n[9].SpiralMode,"ps":3},{"n":"speed","dv":1.0,"o":true,"pt":$n[0].Single,"ps":4},{"n":"frequency","dv":10.0,"o":true,"pt":$n[0].Single,"ps":5},{"n":"depth","dv":0.0,"o":true,"pt":$n[0].Single,"ps":6},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":7}],"sn":"DOSpiral","rt":$n[9].Tweener,"p":[$n[1].Rigidbody,$n[0].Single,$n[0].Nullable$1(UnityEngine.Vector3),$n[9].SpiralMode,$n[0].Single,$n[0].Single,$n[0].Single,$n[0].Boolean]},{"a":2,"n":"DOSpiral","is":true,"t":8,"pi":[{"n":"target","pt":$n[1].Transform,"ps":0},{"n":"duration","pt":$n[0].Single,"ps":1},{"n":"axis","dv":null,"o":true,"pt":$n[0].Nullable$1(UnityEngine.Vector3),"ps":2},{"n":"mode","dv":0,"o":true,"pt":$n[9].SpiralMode,"ps":3},{"n":"speed","dv":1.0,"o":true,"pt":$n[0].Single,"ps":4},{"n":"frequency","dv":10.0,"o":true,"pt":$n[0].Single,"ps":5},{"n":"depth","dv":0.0,"o":true,"pt":$n[0].Single,"ps":6},{"n":"snapping","dv":false,"o":true,"pt":$n[0].Boolean,"ps":7}],"sn":"DOSpiral$1","rt":$n[9].Tweener,"p":[$n[1].Transform,$n[0].Single,$n[0].Nullable$1(UnityEngine.Vector3),$n[9].SpiralMode,$n[0].Single,$n[0].Single,$n[0].Single,$n[0].Boolean]}]}; }, $n);
    /*DG.Tweening.DOTweenProShortcuts end.*/

    }});
