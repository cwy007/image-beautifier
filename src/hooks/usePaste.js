import { useEffect } from "react";
import { supportImg } from "@utils/utils";

export default (toPaste, dependencies = []) => {
  useEffect(() => {
    const getPaste = async (e) => {
      const data = e.clipboardData; // 剪切板数据
      if (!data || !data.items) return;

      const items = Array.from(data.items).filter((e) =>
        supportImg.includes(e.type)
      );
      if (!items.length) return;

      const file = items[0].getAsFile();
      toPaste && toPaste(file);
    };

    // paste 事件
    document.addEventListener("paste", getPaste, false);
    return () => {
      document.removeEventListener("paste", getPaste);
    };
  }, [...dependencies]);
};
