import React, { useContext, useMemo } from "react";
import { SwapPair, SwapType } from "./context";
import { getNFloatNumber } from "./utils";
import { SwapTypeEnum } from "./ConfirmModal";

export default function Rate({ disabled = false }: { disabled?: boolean }) {
  const swapPair = useContext(SwapPair);
  const swapType = useContext(SwapType);

  const yFormatValue = useMemo(() => {
    if ([SwapTypeEnum.wrap, SwapTypeEnum.unWrap].includes(swapType!)) {
      return 1;
    }
    return getNFloatNumber(
      Number(swapPair[1].formatted) / Number(swapPair[0].formatted)
    );
  }, [swapPair, swapType]);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{ opacity: disabled ? 0.4 : 1, userSelect: "none" }}
    >
      1 {swapPair[0].symbol} = {yFormatValue} {swapPair[1].symbol}
    </span>
  );
}
