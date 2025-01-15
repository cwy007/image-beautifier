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

  /** 添加css动画 invalid - 可以删除 */
  invalid = false;

  /** 创建好的 App */
  app = null;

  /** 缩放比例 */
  scale = 100;
  /** 当前使用的标注工具 */
  useTool = null;
  /** 标准颜色 */
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

  /** 已经添加的所有标注 */
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

  /** 显示编辑器，正在编辑中 */
  get isEditing() {
    const is = !!this.app?.tree;
    if (!is) {
    console.log('is', is)
      this.message.info("Please add a image");
    //   this.setInvalid();
    }
    return is;
  }

  /** 下一个步骤 - 步骤的值是自动递增的 */
  get nextStep() {
    const steps = this.shapesList.filter((e) => e.type === "Step");
    const maxItem = maxBy(steps, (item) => Number(item.text));
    if (maxItem?.text) return Number(maxItem.text) + 1;
    return 1; // 步骤的开始值是1
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

  /** 不是编辑中是，添加 invalid css 动画 */
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

  /** 添加新的标注 */
  addShape(shape) {
    this.shapes.set(shape.id, shape);
  }

  /** 删除标注 */
  removeShape(shape) {
    this.shapes.delete(shape.id);
    if (this.snap && this.shapesList.every((e) => e.type !== "Magnifier")) {
      this.snap = null;
    }
  }

  /** 保存创建好的 App  */
  setApp(app) {
    this.app = app;
  }

  /** 页面中显示的当前缩放比例 */
  setScale(value) {
    this.scale = parseInt(value * 100);
  }

  /** 选择/清除当前使用的标注工具 */
  setUseTool(value) {
    this.useTool = value;
    if (value) {
      this.setSelect(false);
    } else {
      this.setSelect(true);
    }
  }

  /** 标注或移动图片 */
  setSelect(value) {
    if (!this.app) return;
    // 平移视图相关配置，应用运行中修改 app.config.move 立即生效。
    this.app.editor.app.config.move.drag = false; // 为true时，选中标注工具后，不能标注图片，只会移动图片
    /**
     * 编辑器是否响应交互事件，默认为 true。
     * 设为 false 后，将禁用编辑器交互。
     */
    this.app.editor.hittable = value; // 这里为true时，可以移动编辑器的位置，也就是移动图片
  }

  /** 设置标注颜色 */
  setAnnotateColor(color) {
    this.annotateColor = color;
    if (!this.app?.editor) return;

    // 选中元素列表，没有时为空数组。
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

  /** 清空图片 */
  clearImg() {
    this.img = {};
  }

  /** 删除图片，恢复到 init 状态，需要重新上传图片 */
  destroy() {
    this.app?.destroy(true); // 销毁应用，同步方式
    this.app = null;
    this.snap = null;
    this.shapes.clear();
    this.setUseTool(null);
  }
}

const editor = new Editor();

export default editor;
