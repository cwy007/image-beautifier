import { makeAutoObservable, toJS } from "mobx";
import { applyFormatters, makeLoggable } from 'mobx-log';
import backgroundConfig from "@utils/backgroundConfig";

applyFormatters();

class Option {
  scale = 1;
  scaleX = false;
  scaleY = false;
  padding = 0;
  paddingBg = "rgba(255,255,255, 100)";
  round = 10;
  shadow = 3;
  frame = "none";
  frameMode = "cover";
  background = "default_1";
  align = "center";
  waterImg = null;
  waterIndex = 1;

  /** 图片尺寸 */
  size = {
    /** 类型 */
    type: "auto",
    /** 图片尺寸标题 */
    title: "Auto",
  };

  /** 设备套壳 - 框架框架宽高 */
  frameConf = {
    width: 800, // 大小是由上传的图片确定的
    height: 600, // 大小是由上传的图片确定的
    /** 背景色 */
    background: {
      type: "linear", // 线性渐变
      from: "left",
      to: "right",
      stops: ["#6366f1", "#a855f7", "#ec4899"], // 渐变色
    },
  };

  constructor() {
    makeAutoObservable(this);
    makeLoggable(this);
  }

  get waterSvg() {
    return toJS(this.waterImg);
  }

  get mode() {
    return this.frame === "none" || this.frame.includes("Bar")
      ? "cover"
      : this.frameMode;
  }

  setScale(value) {
    this.scale = value;
  }

  setPadding(value) {
    this.padding = value;
  }

  setPaddingBg(value) {
    this.paddingBg = value;
  }

  setRound(value) {
    this.round = value;
  }

  setShadow(value) {
    this.shadow = value;
  }

  setFrame(value) {
    this.frame = value;
  }

  setFrameMode(value) {
    this.frameMode = value;
  }

  /** 设备套壳 - 框架框架宽高 */
  setFrameSize(width, height) {
    if (!width || !height) return;
    this.frameConf.width = width;
    this.frameConf.height = height;
  }

  setAlign(value) {
    this.align = value;
  }

  setSize(value) {
    this.size.type = value.type;
    this.size.title = value.title;
    this.setFrameSize(value.width, value.height);
  }

  setBackground(value) {
    this.background = value;
    this.frameConf.background = backgroundConfig[value].fill;
  }
  toggleFlip(type) {
    if (type === "x") {
      this.scaleX = !this.scaleX;
    }
    if (type === "y") {
      this.scaleY = !this.scaleY;
    }
  }
  setWaterImg(value) {
    this.waterImg = value;
  }
  setWaterIndex(value) {
    this.waterIndex = value;
  }
}

const option = new Option();

export default option;
