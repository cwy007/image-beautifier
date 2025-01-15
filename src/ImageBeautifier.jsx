import { useMemo, useEffect } from "react";
import { message } from "antd";
import { observer } from "mobx-react-lite";
import { ConfigProvider, theme } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";

import Header from "@components/header/Header";
import Editor from "@components/editor/Editor";
import SideBar from "@components/sideBar/SideBar";
import Init from "@components/init/Init";
import useSetImg from "@hooks/useSetImg";
import stores from "@stores";
import "@style/tailwind.css";
import { cn } from "@utils/utils";
import { autorun } from 'mobx';

/**
 *
 * @param {*} defaultImg blob | dataURL 默认显示的图片
 * @param isDark boolean 主题颜色是否是深色 dark
 * @param boxClassName
 * @param onClear
 * @returns
 */
const ImageBeautifier = ({
  defaultImg,
  // headLeft,
  // headRight,
  isDark,
  boxClassName = "",
  onClear,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const getFile = useSetImg(stores);

  stores.editor.setMessage(messageApi);
  stores.editor.setClearFun(onClear);

  useMemo(() => {
    const mode =
      isDark || localStorage.getItem("SHOTEASY_BEAUTIFIER_THEME") === "dark"
        ? "dark"
        : "light";
    stores.editor.setTheme(mode);
  }, [isDark]);

  useEffect(() => {
    if (defaultImg) {
      getFile(defaultImg, "dataURL");
    }
  }, [defaultImg]);

  // const workplace = stores.editor.img?.src ? <Editor /> : <Init />;

  autorun(() => {
    if (!stores.editor.isEditing) {
      stores.editor.setInvalid();
    }
  })

  return (
    <StyleProvider>
      <ConfigProvider
        theme={{
          algorithm: stores.editor.isDark
            ? theme.darkAlgorithm
            : theme.defaultAlgorithm,
        }}
      >
        {contextHolder}

        <div
          id="image-beautifier-container"
          className={cn(
            "polka flex flex-col overflow-hidden antialiased w-full h-[100vh] dark:bg-black",
            boxClassName
          )}
          data-mode={stores.editor.isDark ? "dark" : "light"} // 深浅色主题
        >
          <Header />

          <div className="flex flex-col flex-1 h-0 md:flex-row md:items-stretch">
            {/* {workplace} */}
            {/* {stores.editor.img?.src ? <Editor /> : <Init />} */}
            <Editor />

            <SideBar />
          </div>
        </div>
      </ConfigProvider>
    </StyleProvider>
  );
};

export default observer(ImageBeautifier);
