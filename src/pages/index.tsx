import Head from "next/head";
import Image from "next/image";
import {
  erc20ABI,
  useContractWrite,
  useWaitForTransaction,
  useContractRead,
} from "wagmi";
import React, { useState } from "react";
import Web3 from "web3";
import favicon from "../assets/favicon.ico";
import logo from "../assets/logo.svg";
import { Button } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import NumericInput from "../components/NumericInput";
import currencyMap from "@/components/currencyMap";
import type { Currency, CurrencyV } from "@/components/currencyMap";
import { swapContractAddress, swapAbi } from "@/components/constant";
import { useDebounceFn } from "ahooks";
import { useAccount } from "wagmi";
import { ChainId } from "iziswap-sdk/lib/base/types";
import { getTokenChainPath } from "iziswap-sdk/lib/base";
import { PathQueryResult } from "iziswap-sdk/lib/search/types";
import { searchPath } from "../components/onchainUtils";

import styles from "@/styles/Home.module.less";

export default function Home() {
  const [isNetworkSwitchHighlighted, setIsNetworkSwitchHighlighted] =
    useState(false);
  const [isConnectHighlighted, setIsConnectHighlighted] = useState(false);

  const [swapPair, setSwapPair] = useState<[CurrencyV, CurrencyV]>([
    { ...currencyMap.ETH, value: "", bnValue: 0n },
    { value: "", bnValue: 0n },
  ]);
  const [searchPathInfo, setSearchPathInfo] = useState<PathQueryResult>();

  const { address } = useAccount();

  const closeAll = () => {
    setIsNetworkSwitchHighlighted(false);
    setIsConnectHighlighted(false);
  };

  const onCurrencySelect = (currency: Currency, index: 0 | 1 = 0) => {
    // console.log({ currency, swapPair, index });
    if (currency.symbol === swapPair[1 - index].symbol) {
      setSwapPair((sp) => {
        return [sp[1], sp[0]];
      });
    } else {
      setSwapPair((sp) => {
        sp[index] = {
          ...currency,
          value: sp[index].value,
          bnValue:
            BigInt(Number(sp[index].value) * 10 ** 5) * 10n ** (18n - 5n),
        };
        return [...sp];
      });
    }
  };

  const onClickOrder = () => {
    setSwapPair((sp) => {
      return [sp[1], sp[0]];
    });
  };

  const onInputAmountChange = (v: string) => {
    setSwapPair((sp) => [
      {
        ...sp[0],
        value: v,
        bnValue: BigInt(Number(v) * 10 ** 5) * 10n ** (18n - 5n),
      },
      sp[1],
    ]);
    if (v && v! == swapPair[0].value && swapPair.every((sp) => !!sp.address)) {
      debounceInputAmountChange(v);
    }
  };

  const {
    run: debounceInputAmountChange,
    // cancel,
    // flush,
  } = useDebounceFn(
    (value: string) => {
      searchPath(
        {
          address: swapPair[0].address!,
          symbol: swapPair[0].symbol!,
          chainId: ChainId.ScrollTestL2,
          decimal: 18,
        },
        {
          address: swapPair[1].address!,
          symbol: swapPair[1].symbol!,
          chainId: ChainId.ScrollTestL2,
          decimal: 18,
        },
        Web3.utils.toWei(value, "ether")
      ).then((res) => {
        setSearchPathInfo(res);
        if (res.amount) {
          const outputValue = Web3.utils.fromWei(res.amount, "ether");
          setSwapPair((sp) => [
            sp[0],
            {
              ...sp[1],
              value: outputValue,
              // TM_TODO
              // bnValue:
              //   BigInt(Number(outputValue) * 10 ** 5) * 10n ** (18n - 5n),
            },
          ]);
        }
      });
    },
    {
      wait: 500,
    }
  );

  // 获取erc20 allowance
  const { data: allowanceData, refetch } = useContractRead({
    address: swapPair[0].address as `0x${string}`,
    abi: erc20ABI,
    functionName: "allowance",
    args: [address!, swapContractAddress],
  });

  console.log({ allowanceData });

  // approve上链前
  const { data: approveData, write: approveWrites } = useContractWrite({
    abi: erc20ABI,
    functionName: "approve",
    address: swapPair[0].address as `0x${string}`,
    // onError: (error) => {
    //   console.log("Error", error);
    // },
  });

  // approve上链后
  useWaitForTransaction({
    hash: approveData?.hash,
    onSuccess: async () => {
      const { data: allowance } = await refetch();
      if (allowance && allowance >= swapPair[0].bnValue) {
        writeSwap();
      }
    },
  });

  // swap上链前
  const { isLoading, isSuccess, data, error, write } = useContractWrite({
    abi: swapAbi,
    functionName: "swapAmount",
    address: swapContractAddress,
    // onError: (error) => {
    //   console.log("Error", error);
    // },
    // onSuccess: (data) => {
    //   console.log("data", data.hash);
    // },
  });

  // swap上链后
  const {
    isLoading: isLoading2,
    isSuccess: isSuccess2,
    error: error2,
  } = useWaitForTransaction({
    hash: data?.hash,
  });

  console.log({ isLoading, isSuccess, error, isLoading2, isSuccess2, error2 });

  const writeSwap = () => {
    write?.({
      args: [
        {
          path: getTokenChainPath(
            searchPathInfo!.path.tokenChain,
            searchPathInfo!.path.feeContractNumber
          ), //pathWithFee
          recipient: address,
          amount:
            BigInt(Number(swapPair[0]?.value) * 10 ** 5) * 10n ** (18n - 5n),
          minAcquired: (BigInt(searchPathInfo!.amount) * 95n) / 100n,
          deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10 分钟
        },
      ],
      // value: 0,
    });
  };

  const onClickSwap = () => {
    // 检查授权
    console.log({ bnValue: swapPair[0].bnValue });
    if (!allowanceData || allowanceData < swapPair[0].bnValue) {
      approveWrites?.({
        args: [swapContractAddress, swapPair[0].bnValue],
      });
    } else {
      writeSwap();
    }
  };

  return (
    <>
      <Head>
        <title>AdamSwap</title>
        <meta name="description" content="Generated by create-wc-dapp" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={favicon.src} />
      </Head>
      <header>
        <div
          className={styles.backdrop}
          style={{
            opacity: isConnectHighlighted || isNetworkSwitchHighlighted ? 1 : 0,
          }}
        />
        <div className={styles.header}>
          <div className={styles.logo}>
            <Image src={logo.src} alt="EasySwap" height="32" width="203" />
          </div>
          <div className={styles.buttons}>
            <div
              onClick={closeAll}
              className={`${styles.highlight} ${
                isNetworkSwitchHighlighted ? styles.highlightSelected : ``
              }`}
            >
              <w3m-network-button />
            </div>
            <div
              onClick={closeAll}
              className={`${styles.highlight} ${
                isConnectHighlighted ? styles.highlightSelected : ``
              }`}
            >
              <w3m-button />
            </div>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.wrapper}>
          <div className={styles.container}>
            <div className={styles.title}>Swap</div>
            <NumericInput
              tip="Pay"
              index={0}
              swapPair={swapPair}
              onSelect={(e) => onCurrencySelect(e, 0)}
              onChange={onInputAmountChange}
            />
            <div className={styles.divide}>
              <div className={styles.swapIcon} onClick={onClickOrder}>
                <SwapOutlined />
              </div>
            </div>
            <NumericInput
              tip="Receive"
              index={1}
              swapPair={swapPair}
              onSelect={(e) => onCurrencySelect(e, 1)}
              onChange={(v) =>
                setSwapPair((sp) => [sp[0], { ...sp[1], value: v }])
              }
            />
            <Button
              className="swap-primary-btn"
              type="primary"
              size="large"
              disabled={swapPair.some((sp) => !sp.symbol || !sp.value)}
              onClick={onClickSwap}
            >
              {swapPair.some((sp) => !sp.symbol) ? "Select a token" : "Swap"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
