import { useAccount, useContractWrite, useNetwork } from "wagmi";
import { encodeFunctionData, createPublicClient, http } from "viem";
import { getSwapInfoMap, SwapTypeEnum } from "./ConfirmModal";
import { useContext } from "react";
import { SwapType } from "./context";

type PropsType = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: Error | any) => void;
};

export function useSwapWrite({ onError }: PropsType) {
  const { address: accountAddress } = useAccount();
  const { chain: connectChain } = useNetwork();
  const swapType = useContext(SwapType) as SwapTypeEnum;
  const swapInfoMap = getSwapInfoMap(connectChain!.id);

  const publicClient = createPublicClient({
    chain: connectChain,
    transport: http(),
  });

  const { data, write } = useContractWrite({
    abi: swapInfoMap[swapType].abi,
    functionName: swapInfoMap[swapType].functionName[0],
    address: swapInfoMap[swapType].contractAddress,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: onError,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const advanceWrite = async (params: any) => {
    let _params = params;
    if ([SwapTypeEnum.erc204Eth, SwapTypeEnum.eth4Erc20].includes(swapType)) {
      const callData = [
        encodeFunctionData({
          abi: swapInfoMap[swapType].abi,
          functionName: swapInfoMap[swapType].functionName[1],
          args: params.args,
        }),
        encodeFunctionData({
          abi: swapInfoMap[swapType].abi,
          functionName: swapInfoMap[swapType].functionName[2],
          args:
            swapType === SwapTypeEnum.erc204Eth
              ? [0, accountAddress]
              : undefined,
        }),
      ];
      _params = { ...params, args: [callData] };
    }

    let estimateGasLimit = null;
    try {
      estimateGasLimit = await publicClient.estimateContractGas({
        ..._params,
        account: accountAddress as `0x${string}`,
        abi: swapInfoMap[swapType].abi,
        functionName: swapInfoMap[swapType].functionName[0],
        address: swapInfoMap[swapType].contractAddress,
      });
    } catch (e) {
      console.log(e);
    }

    return write({ ..._params, gas: estimateGasLimit });
  };

  return { data, write: advanceWrite };
}
