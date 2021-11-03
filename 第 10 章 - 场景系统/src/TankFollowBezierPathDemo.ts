import { CanvasKeyBoardEvent, CanvasMouseEvent, EInputEventType } from './Core/Event';
import { vec2 } from './Math/vec2';
import { ERenderType, IShape, ISprite } from './SpriteSys/ISprite';
import { Sprite2DApplication } from './SpriteSys/Sprite2DApplication';
import { SpriteFactory } from './SpriteSys/SpriteFactory';

class TankFollowBEzierPathDemo {
	// 指向入口
	private _app: Sprite2DApplication;

	private _curvePts: vec2[]; // 存储所有锚点和控制点的数组
	private _bezierPath!: IShape; // 使用上面的点集数组创建二次贝塞尔形体对象

	private _circle: IShape;
	private _rect: IShape;

	private _addPointEnd: boolean; /// 曲线封闭路径是否生成

	private _speed: number; // 坦克运行速度

	private _curveIndex: number;
	private _curveParamT: number;

	private _position: vec2; // 插值计算当前的 tank 位置

	private _lastPosition: vec2; // 通过 position 和 lastPosition 这个两个位置的差，就能调用 vec2.getOrientation 算出坦克正确朝向

	public constructor(app: Sprite2DApplication) {
		this._app = app;

		this._addPointEnd = false;

		// 如果生成 tank ，初始化时，坦克位于第一条贝赛尔曲线的 t 为 0 的插值点处！！
		this._curveIndex = 0;
		this._curveParamT = 0;

		this._position = vec2.create();
		this._lastPosition = vec2.create();

		this._speed = 5;
		this._curvePts = [];

		this._circle = SpriteFactory.createCircle(5);
		this._rect = SpriteFactory.createRect(10, 10, 0.5, 0.5);

		if (this._app.rootContainer.sprite !== undefined) {
			this._app.rootContainer.sprite.mouseEvent = this.mouseEvent.bind(this);
			this._app.rootContainer.sprite.keyEvent = this.keyEvent.bind(this);
		}
		this._app.start();
	}

	// 生成锚点或控制点精灵代码
	private createBezierMarker(x: number, y: number, isCircle: boolean): void {
		let idx: number = this._curvePts.length;
		// 1. 将当前点坐标添加到 curvePts 数组中
		this._curvePts.push(vec2.create(x, y));
		// 2. 创建精灵对象
		let spr: ISprite;
		if (isCircle) {
			spr = SpriteFactory.createSprite(this._circle);
			spr.fillStyle = 'blue';
		} else {
			spr = SpriteFactory.createSprite(this._rect);
			spr.fillStyle = 'red';
		}

		// 鼠标点击处坐标
		spr.x = x;
		spr.y = y;
		spr.name = 'curvePt' + this._curvePts.length;

		this._app.rootContainer.addSprite(spr);

		// 3. 精灵对象添加 drag 事件，使用匿名箭头函数
		spr.mouseEvent = (s: ISprite, evt: CanvasMouseEvent) => {
			if (evt.type === EInputEventType.MOUSEDRAG) {
				spr.x = evt.canvasPosition.x;
				spr.y = evt.canvasPosition.y;

				// 当拖动时，会实时更新贝塞尔曲线上对应的 锚点或控制点的坐标
				this._curvePts[idx].x = spr.x;
				this._curvePts[idx].y = spr.y;
			}
		};
	}

	// 生成锚点与控制点之间的连线
	private createLine(start: vec2, end: vec2, idx: number): void {
		let line: ISprite = SpriteFactory.createISprite(SpriteFactory.createLine(start, end), 0, 0);
		line.lineWidth = 2;
		line.strokeStyle = 'green';
		line.name = 'line' + idx;
		this._app.rootContainer.addSprite(line);
	}

	// 创建贝塞尔曲线
	private createBezierPath(): void {
		this._bezierPath = SpriteFactory.createBezierPath(this._curvePts);
		let sprite: ISprite = SpriteFactory.createSprite(this._bezierPath);
		sprite.strokeStyle = 'blue';
		sprite.renderType = ERenderType.STROKE;
		sprite.name = 'bezierPath';
		this._app.rootContainer.addSprite(sprite);

		for (let i = 1; i < this._curvePts.length; i += 2) {
			this.createLine(this._curvePts[i - 1], this._curvePts[i], i);
		}
	}

	private createTank(x: number, y: number, width: number, height: number, gunLength: number): void {
		let shape: IShape = SpriteFactory.createRect(width, height, 0.5, 0.5);
		let tank: ISprite = SpriteFactory.createISprite(shape, x, y, 0, 1, 1);
		tank.fillStyle = 'tank';
		tank.name = 'tank';
		this._app.rootContainer.addSprite(tank);

		shape = SpriteFactory.createEllipse(15, 10);
		let turret: ISprite = SpriteFactory.createSprite(shape);
		turret.fillStyle = 'red';
		turret.name = 'turret';
		turret.keyEvent = this.keyEvent.bind(this);
		tank.owner.addSprite(turret);

		shape = SpriteFactory.createLine(vec2.create(0, 0), vec2.create(gunLength, 0));
		let gun: ISprite = SpriteFactory.createISprite(shape);
		gun.strokeStyle = 'blue';
		gun.lineWidth = 3;
		gun.name = 'gun';
		turret.owner.addSprite(gun);
	}

	private mouseEvent(spr: ISprite, evt: CanvasMouseEvent): void {
		if (evt.type === EInputEventType.MOUSEDOWN) {
			if (spr === this._app.rootContainer.sprite) {
				if (this._addPointEnd === true) {
					return;
				}
				if (this._curvePts.length % 2 === 0) {
					this.createBezierMarker(evt.canvasPosition.x, evt.canvasPosition.y, true);
				} else {
					this.createBezierMarker(evt.canvasPosition.x, evt.canvasPosition.y, false);
				}
			}
		}
	}
	private keyEvent(spr: ISprite, evt: CanvasKeyBoardEvent): void {
		if (evt.type === EInputEventType.KEYUP) {
			if (evt.key === 'e') {
				if (this._addPointEnd === true) {
					return;
				}
				if (this._curvePts.length > 3) {
					if ((this._curvePts.length - 1) % 2 > 0) {
						// 剩余一个点，则把第一个定点 push 到 curvePts 的尾部
						this._curvePts.push(this._curvePts[0]);
						this._addPointEnd = true;
						this.createBezierPath();
						this._position.x = this._curvePts[0].x;
						this._position.y = this._curvePts[0].y;

						this.createTank(this._position.x, this._position.y, 80, 50, 80);
					}
				}
			} else if (evt.key === 'r') {
				if (this._addPointEnd === true) {
					this._addPointEnd = false;
					this._curvePts = [];
					this._app.rootContainer.removeAll(false);
				}
			}
		} else if (evt.type === EInputEventType.KEYPRESS) {
			if (evt.key === 'a') {
				if (this._addPointEnd === true) {
					if (spr.name === 'turret') {
						spr.rotation += 5;
					}
				}
			} else if (evt.key === 's') {
				if (this._addPointEnd === true) {
					if (spr.name === 'turret') {
						spr.rotation -= 5;
					}
				}
			}
		}
	}
}

let canvas: HTMLCanvasElement | null = document.getElementById('canvas') as HTMLCanvasElement;

let app: Sprite2DApplication = new Sprite2DApplication(canvas);

new TankFollowBEzierPathDemo(app);
