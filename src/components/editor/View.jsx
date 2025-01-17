import { useEffect } from "react";
import { observer } from "mobx-react-lite";

import {
  App,
  ResizeEvent,
  ZoomEvent,
  DragEvent,
  PointerEvent,
  Cursor,
} from "leafer-ui";
import { EditorMoveEvent } from "@leafer-in/editor";
import "@leafer-in/view";
import { ScrollBar } from "@leafer-in/scroll";

import debounce from "lodash/debounce";
import { addListener, removeListener } from "resize-detector";

import rotatePng from "@assets/rotate.png";
import pencilPng from "@assets/pencil.png";
import stores from "@stores";

import FrameBox from "./layers/FrameBox";
import Screenshot from "./layers/Screenshot";
import Watermark from "./layers/Watermark";
import ShapeLine from "./layers/ShapeLine";
import { nanoid } from "@utils/utils";
import HotKeys from "./HotKeys";


Cursor.set("pencil", { url: pencilPng }); // 铅笔光标

const View = ({ target }) => {
  useEffect(() => {
    // 创建 App
    const app = new App({
      view: target,
      // https://www.leaferjs.com/ui/plugin/in/editor/config.html#lockratio-boolean-corner
      editor: {
        lockRatio: "corner", // 设置 'corner' 表示只固定 4 个角的缩放比例，中间点可自由调整。
        stroke: "#3f99f7", // 设置控制点和编辑框的描边颜色，默认为 #836DFF。
        // stroke: 'yellow',
        skewable: false, // 是否启用倾斜， 默认启用
        hover: false, // 是否显示 hover 状态，默认显示
        middlePoint: { cornerRadius: 100, width: 20, height: 6 }, // 设置中间控制点样式（会继承基础样式），可单独设置 4 个点，为空时不显示， 默认为空
        rotatePoint: {
          width: 20,
          height: 20,
          fill: {
            type: "image",
            url: rotatePng,
          },
        }, // 编辑框底部透明的 8 个 rotate 控制点。
      }, // 添加图形编辑器，用于选中元素进行编辑操作; 配置 editor 会自动创建并添加 app.editor 实例
      tree: {
        usePartRender: true, // 局部渲染
      }, // 添加 tree 层
      sky: {
        type: "draw",
        usePartRender: true, // 局部渲染
      }, // 添加 sky 层
    });
    new ScrollBar(app); // 添加滚动条

    stores.editor.setApp(app);

    // app.tree 树结构 (主要内容层)，位于中间的 Leafer 实例，相当于 HTML 中的 body。
    app.tree.on(ZoomEvent.ZOOM, () => {
      stores.editor.setScale(app.tree.scale);
    }); // 缩放
    app.tree.on(ResizeEvent.RESIZE, () => {
      stores.editor.setScale(app.tree.scale);
    }); // 调整大小

    // sky 天空层 (变化层)，位于最顶部的 Leafer 实例，一般用来渲染 图形编辑器 实例。
    app.editor.on(EditorMoveEvent.SELECT, (event) => {
      const { list } = event;
      if (list.length < 2) return;

      if (list.some((e) => e.tag === "Magnifier")) {
        app.editor.config.rotateable = false; // 是否启用旋转，默认启用。
        app.editor.config.lockRatio = true; // 锁定宽高比例, 默认为 false。
      } else {
        app.editor.config.rotateable = true;
        app.editor.config.lockRatio = false;
      }
    });

    let shapeId = null;
    const onStart = (arg) => {
      console.log('stores.editor.useTool', stores.editor.useTool)
      if (!stores.editor.useTool) return;

      // target - 是添加的标注步骤
      const { target } = arg;
      const shape = stores.editor.getShape(target.id);
      if (shape) return;

      shapeId = nanoid();
      const size = arg.getPageBounds ? arg.getPageBounds() : arg.getPage();
      const type = stores.editor.useTool;
      const newShape = {
        id: shapeId,
        type,
        fill: stores.editor.annotateColor,
        strokeWidth: stores.editor.strokeWidth,
        zIndex: stores.editor.shapes.size + 1,
        ...size, // size -> x, y
      };
      return newShape;
    };
    app.tree.on(PointerEvent.DOWN, (arg) => {
      const type = stores.editor.useTool;
      if (type !== "Step") return; // Step 标记步骤 1，2 ...

      const newShape = onStart(arg);
      if (!newShape) return;

      newShape.text = stores.editor.nextStep;
      newShape.editable = true;
      stores.editor.addShape(newShape);
      shapeId = null;
      stores.editor.setUseTool(null);
    });

    app.tree.on(DragEvent.START, (arg) => {
      const type = stores.editor.useTool;
      if (type === "Step") return;
      const newShape = onStart(arg);
      if (!newShape) return;
      if (["Slash", "MoveDownLeft", "Pencil"].includes(type)) {
        newShape.points = [newShape.x, newShape.y];
      }
      stores.editor.addShape(newShape);
    });
    app.tree.on(DragEvent.DRAG, (arg) => {
      if (!stores.editor.useTool) return;
      if (!shapeId) return;
      const shape = stores.editor.getShape(shapeId);
      if (!shape) return;
      const size = arg.getPageBounds();
      const max = Math.max(size.width, size.height);
      if (shape.type === "Magnifier") {
        size.width = max;
        size.height = max;
      }
      const newShape = Object.assign({}, shape, size);
      const { points, type } = newShape;
      if (points && points.length) {
        const { x, y } = arg.getInnerTotal();
        const newX = x > 0 ? size.x + x : size.x;
        const newY = y > 0 ? size.y + y : size.y;
        if (type === "Pencil") {
          newShape.points = [...points, newX, newY];
        } else {
          newShape.points = [points[0], points[1], newX, newY];
        }
      }
      stores.editor.addShape(newShape);
    });
    app.tree.on(DragEvent.END, () => {
      if (!stores.editor.useTool) return;
      if (!shapeId) return;
      const shape = stores.editor.getShape(shapeId);
      if (shape) {
        if (
          (shape.width === 0 || shape.height === 0) &&
          !["Slash", "MoveDownLeft", "Pencil"].includes(shape.type)
        ) {
          stores.editor.removeShape(shape);
        } else {
          stores.editor.addShape(Object.assign({}, shape, { editable: true }));
        }
      }
      shapeId = null;
      if (stores.editor.useTool !== "Pencil") stores.editor.setUseTool(null);
    });

    // 监听容器变化
    const onResize = debounce(() => {
      const { width, height } = target.getBoundingClientRect();
      app.tree.zoom("fit", 100);
      if (
        stores.option.frameConf.width < width &&
        stores.option.frameConf.height < height
      ) {
        app.tree.zoom(1);
      }
    }, 50);

    addListener(target, onResize);

    return () => {
      removeListener(target, onResize);
      stores.editor.destroy();
    };
  }, [target]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { width, height } = target.getBoundingClientRect();
      stores.editor.app.tree.zoom("fit", 100);
      if (
        stores.option.frameConf.width < width &&
        stores.option.frameConf.height < height
      ) {
        stores.editor.app.tree.zoom(1);
      }
      stores.editor.setScale(stores.editor.app.tree.scale);
    }, 20);
    return () => {
      clearTimeout(timer);
    };
  }, [stores.option.frameConf.width, stores.option.frameConf.height]);

  // https://www.leaferjs.com/ui/reference/display/App.html#app
  // app.tree 树结构 (主要内容层)，位于中间的 Leafer 实例，相当于 HTML 中的 body。
  if (!stores.editor.app?.tree) return null;

  return (
    <>
      <FrameBox
        parent={stores.editor.app.tree}
        cursor={stores.editor.cursor}
        {...stores.option.frameConf}
      >
        {stores.editor.shapesList.map((item) => {
          const { id, type } = item;
          const props = Object.assign(
            {},
            item,
            type === "Magnifier" ? { snap: stores.editor.snap } : {}
          );
          return <ShapeLine key={id} {...props} />;
        })}
        {stores.editor.img?.src && <Screenshot />}
        {stores.option.waterImg && <Watermark />}
      </FrameBox>
      <HotKeys />
    </>
  );
}

export default observer(View);
