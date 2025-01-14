import { makeAutoObservable, toJS, action, runInAction } from "mobx";
import { applyFormatters, makeLoggable } from 'mobx-log';
import { maxBy } from "lodash";

applyFormatters();

let timer;
class Editor {
  /**
   * {
   *   src 图片url
   *   width 图片 width
   *   height 图片 height
   *   type 图片类型，默认 image/png
   *   name 图片名称，默认 ShotEasy.png
   * }
   */
  img = {};

  invalid = false;

  /**  */
  app = null;

  scale = 100;
  useTool = null;
  annotateColor = "#ff0000";

  /** 标注线条粗细 */
  strokeWidth = 4;

  /** 标注的内容 */
  shapes = new Map();

  /** ant design messageInstance */
  message = null;

  /** 主题 - dark | light */
  theme = "light";

  /** props onClear */
  clearFun = null;

  snap = null;

  constructor() {
    makeAutoObservable(this);
    makeLoggable(this);
  }

  get shapesList() {
    return Array.from(toJS(this.shapes).values());
  }

  get cursor() {
    return this.useTool === "Pencil"
      ? "pencil"
      : this.useTool
      ? "crosshair"
      : "auto";
  }

  get isEditing() {
    const is = !!this.app?.tree;
    if (!is) {
      this.message.info("Please add a image");
      this.setInvalid();
    }
    return is;
  }

  get nextStep() {
    const steps = this.shapesList.filter((e) => e.type === "Step");
    const maxItem = maxBy(steps, (item) => Number(item.text));
    if (maxItem?.text) return Number(maxItem.text) + 1;
    return 1;
  }

  /** theme === 'dark' */
  get isDark() {
    return this.theme === "dark";
  }

  // undo
  createSnap(type) {
    if (type === "init" && this.snap?.data) return;
    if (type !== "init" && this.snap === null) return;
    const ex = async () => {
      const frame = this.app?.tree?.children[0];
      if (!frame) return;
      frame.children.map((child) => {
        if (child.id !== "screenshot-box") {
          child.visible = false;
        }
      });
      const image = await frame
        .export("png", { pixelRatio: 2 })
        .catch(() => null);
      frame.children.map((child) => (child.visible = true));
      runInAction(() => {
        this.snap = image;
      });
    };
    ex();
  }

  /** 设置主题 - 深/浅色 */
  setTheme(value) {
    if (value === this.theme) return;

    runInAction(() => {
      if (value) {
        this.theme = value;
      } else {
        this.theme = this.isDark ? "light" : "dark";
      }
    });
  }

  setInvalid() {
    clearTimeout(timer);
    this.invalid = true;
    timer = setTimeout(
      action(() => {
        this.invalid = false;
      }),
      200
    );
  }

  /** 保存加载的图片信息 */
  setImg(value) {
    this.img = value;
  }

  /** set ant design messageInstance */
  setMessage(value) {
    this.message = value;
  }

  getShape(id) {
    return this.shapes.get(id);
  }

  addShape(shape) {
    this.shapes.set(shape.id, shape);
  }

  removeShape(shape) {
    this.shapes.delete(shape.id);
    if (this.snap && this.shapesList.every((e) => e.type !== "Magnifier")) {
      this.snap = null;
    }
  }

  setApp(app) {
    this.app = app;
  }

  setScale(value) {
    this.scale = parseInt(value * 100);
  }

  setUseTool(value) {
    this.useTool = value;
    if (value) {
      this.setSelect(false);
    } else {
      this.setSelect(true);
    }
  }

  setSelect(value) {
    if (!this.app) return;
    this.app.editor.app.config.move.drag = false;
    this.app.editor.hittable = value;
  }

  setAnnotateColor(color) {
    this.annotateColor = color;
    if (!this.app?.editor) return;
    const { list } = this.app.editor;
    if (!list.length) return;
    for (let item of list) {
      const shape = this.shapes.get(item.id);
      if (shape) shape.fill = color;
    }
  }

  /** 标注线条粗细 */
  setStrokeWidth(value) {
    this.strokeWidth = value;

    if (!this.app?.editor) return;
    const { list } = this.app.editor;
    if (!list.length) return;
    for (let item of list) {
      const shape = this.shapes.get(item.id);
      if (shape) shape.strokeWidth = value;
    }
  }

  /** set props onClear */
  setClearFun(value) {
    this.clearFun = value;
  }

  clearImg() {
    this.img = {};
  }

  destroy() {
    this.app?.destroy(true);
    this.app = null;
    this.snap = null;
    this.shapes.clear();
    this.setUseTool(null);
  }
}

const editor = new Editor();

export default editor;
