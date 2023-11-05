import React, { useState } from "react";
import { Input, Tooltip } from "antd";
import styles from "../styles/NumericInput.module.less"
import CurrencySelect from "./CurrencySelect";
import CurrencySelectModal from './CurrencySelectModal'

interface NumericInputProps {
  style?: React.CSSProperties;
  tip?: string;
  value: string;
  onChange: (value: string) => void;
}

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

const NumericInput = (props: NumericInputProps) => {
  const { tip = "", value, onChange } = props;

  const [selectModalShow, setSelectModalShow] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value: inputValue } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if (reg.test(inputValue) || inputValue === "" || inputValue === "-") {
      onChange(inputValue);
    }
  };

  // '.' at the end or only '-' in the input box.
  const handleBlur = () => {
    let valueTemp = value;
    if (value.charAt(value.length - 1) === "." || value === "-") {
      valueTemp = value.slice(0, -1);
    }
    onChange(valueTemp.replace(/0*(\d+)/, "$1"));
  };

  const title = value ? (
    <span className="numeric-input-title">
      {value !== "-" ? formatNumber(Number(value)) : "-"}
    </span>
  ) : (
    "Input a number"
  );

  return (
    <>
      <div className={styles["numeric-input"]}>
        <div className="tip">{tip}</div>
        <div className="center">
          <Input
            {...props}
            size="large"
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="0"
            maxLength={16}
          />
          <CurrencySelect onClick={() => setSelectModalShow(true)} />
        </div>
        <div className="bottom">
          <div className="bottom-left">$1.58</div>
          <div className="bottom-right">Balance: 0.008</div>
        </div>
      </div>
      <CurrencySelectModal open={selectModalShow} onOk={() => {}} onCancel={() => setSelectModalShow(false)} />
    </>
  );
};

export default NumericInput;