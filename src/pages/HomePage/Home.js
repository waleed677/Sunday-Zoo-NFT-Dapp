import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { connectWallet } from "../../redux/blockchain/blockchainActions";
import { fetchData } from "./../../redux/data/dataActions";
import { StyledRoundButton } from "./../../components/styles/styledRoundButton.styled";
import * as s from "./../../styles/globalStyles";

const { createAlchemyWeb3, ethers } = require("@alch/alchemy-web3");
var Web3 = require('web3');
var Contract = require('web3-eth-contract');

function Home() {
  let cost = 0;
  const dispatch = useDispatch();
  const blockchain = useSelector((state) => state.blockchain);
  const data = useSelector((state) => state.data);
  const [claimingNft, setClaimingNft] = useState(false);
  const [mintDone, setMintDone] = useState(false);
  const [supply, setTotalSupply] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [mintAmount, setMintAmount] = useState(1);
  const [displayCost, setDisplayCost] = useState(cost);
  const [state, setState] = useState(-1);
  const [canMintWL, setCanMintWL] = useState(false);
  const [canMintOG, setCanMintOG] = useState(false);
  const [disable, setDisable] = useState(false);
  const [max, setMax] = useState(0);
  const [CONFIG, SET_CONFIG] = useState({
    CONTRACT_ADDRESS: "",
    SCAN_LINK: "",
    NETWORK: {
      NAME: "",
      SYMBOL: "",
      ID: 0,
    },
    NFT_NAME: "",
    SYMBOL: "",
    MAX_SUPPLY: 1,
    WEI_COST: 0,
    DISPLAY_COST: 0,
    GAS_LIMIT: 0,
    MARKETPLACE: "",
    MARKETPLACE_LINK: "",
    SHOW_BACKGROUND: false,
  });

  const claimNFTs = () => {
    let cost = 0;
    if (state == 2) {
      cost = CONFIG.WEI_COST_OG;
    } else if (state == 1) {
      cost = CONFIG.WEI_COST_WL;
    } else {
      cost = CONFIG.WEI_COST_PU;
    }

    let gasLimit = CONFIG.GAS_LIMIT;
    let totalCostWei = String(cost * mintAmount);
    let totalGasLimit = String(gasLimit * mintAmount);
    setFeedback(`Minting your ${CONFIG.NFT_NAME}`);
    setClaimingNft(true);
    setDisable(true);
    blockchain.smartContract.methods
      .mint(mintAmount)
      .send({
        gasLimit: String(totalGasLimit),
        to: CONFIG.CONTRACT_ADDRESS,
        from: blockchain.account,
        value: totalCostWei,
      })
      .once("error", (err) => {
        console.log(err);
        setFeedback("Sorry, something went wrong please try again later.");
        setClaimingNft(false);
      })
      .then((receipt) => {
        setMintDone(true);
        setFeedback(`Done, the ${CONFIG.NFT_NAME} is yours!`);
        setClaimingNft(false);
        blockchain.smartContract.methods
          .totalSupply()
          .call()
          .then((res) => {
            setTotalSupply(res);
          });

        dispatch(fetchData(blockchain.account));
      });
  };

  const decrementMintAmount = () => {
    let newMintAmount = mintAmount - 1;
    if (newMintAmount < 1) {
      newMintAmount = 1;
    }
    setMintAmount(newMintAmount);
    if (state == 1) {
      setDisplayCost(
        parseFloat(CONFIG.DISPLAY_COST_OG * newMintAmount).toFixed(3)
      );
    } else if (state == 2) {
      setDisplayCost(
        parseFloat(CONFIG.DISPLAY_COST_WL * newMintAmount).toFixed(3)
      );
    } else {
      setDisplayCost(
        parseFloat(CONFIG.DISPLAY_COST_PU * newMintAmount).toFixed(3)
      );
    }
  };

  const incrementMintAmount = () => {
    let newMintAmount = mintAmount + 1;

    if (state == 2) {
      newMintAmount > CONFIG.MAX_LIMIT_OG
        ? (newMintAmount = CONFIG.MAX_LIMIT_OG)
        : newMintAmount;
      setDisplayCost(
        parseFloat(CONFIG.DISPLAY_COST_OG * newMintAmount).toFixed(3)
      );
    } else if (state == 1) {
      newMintAmount > CONFIG.MAX_LIMIT_WL
        ? (newMintAmount = CONFIG.MAX_LIMIT_WL)
        : newMintAmount;
      setDisplayCost(
        parseFloat(CONFIG.DISPLAY_COST_WL * newMintAmount).toFixed(3)
      );
    } else {
      newMintAmount > 2
        ? (newMintAmount = 2)
        : newMintAmount;
      setDisplayCost(
        parseFloat(CONFIG.DISPLAY_COST_PU * newMintAmount).toFixed(3)
      );
    }
    setMintAmount(newMintAmount);
  };

  const maxNfts = () => {
    if (state == 2) {
      setMintAmount(max);
      setDisplayCost(
        parseFloat(displayCost * max).toFixed(3)
      );
    } else if (state == 1) {
      setMintAmount(CONFIG.MAX_LIMIT_WL);
      setDisplayCost(
        parseFloat(displayCost * max).toFixed(3)
      );
    } else {
      setMintAmount(2);
      parseFloat(displayCost * max).toFixed(3)
    }
  };

  const getData = async () => {
    if (blockchain.account !== "" && blockchain.smartContract !== null) {
      dispatch(fetchData(blockchain.account));
      const totalSupply = await blockchain.smartContract.methods
        .totalSupply()
        .call();
      setTotalSupply(totalSupply);
      let currentState = await blockchain.smartContract.methods
        .currentState()
        .call();
      setState(currentState);

      if (currentState == 2) {
        setDisplayCost(CONFIG.DISPLAY_COST_OG);
        let mintOG = await blockchain.smartContract.methods
          .isOGed(blockchain.account)
          .call();
        setCanMintOG(mintOG);
        mintOG ? "" : setFeedback(`You are not OGed Member!!!`);
        mintOG ? setDisable(false) : setDisable(true);
      } else if (currentState == 1) {
        let mintWL = await blockchain.smartContract.methods
          .isWhitelisted(blockchain.account)
          .call();
        setCanMintWL(mintWL);
        mintWL ? "" : setFeedback(`You are not WhiteListed Member!!!`);
        mintWL ? setDisable(false) : setDisable(true);
        setDisplayCost(CONFIG.DISPLAY_COST_WL);
      } else {
        setDisplayCost(CONFIG.DISPLAY_COST_PU);
      }
    }
  };

  const getDataWithAlchemy = async () => {
    const web3 = createAlchemyWeb3("https://eth-rinkeby.alchemyapi.io/v2/pBY3syVarS-tO2ZAQlA3uWBq_OqzwIDw");
    const abiResponse = await fetch("/config/abi.json", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const abi = await abiResponse.json();
    var contract = new Contract(abi, '0xBD511eb72780FbcD03417980f7979b1AaA206f97');
    contract.setProvider(web3.currentProvider);
    console.log(contract);
    // Get Total Supply
    const totalSupply = await contract.methods
      .totalSupply()
      .call();
    setTotalSupply(totalSupply);

    // Get Contract State
    let currentState = await contract.methods
      .currentState()
      .call();
    setState(currentState);

    // Set Price and Max According to State

    if (currentState == 0) {
      setFeedback("Mint is not Live Yet!!!");
      setDisable(true);
      setDisplayCost(0.00);
      setMax(0);
    }
    else if (currentState == 1) {
      let wlCost = await contract.methods
        .constWL()
        .call();
      setDisplayCost(web3.utils.fromWei(wlCost));

      let wlMax = await contract.methods
        .maxMintAmountWL()
        .call();
      setMax(wlMax);
    }
    else if (currentState == 2) {
      let ogCost = await contract.methods
        .constOG()
        .call();
      setDisplayCost(web3.utils.fromWei(ogCost));

      let ogMax = await contract.methods
        .maxMintAmountOG()
        .call();
      setMax(ogMax);
    }
    else {
      let puCost = await contract.methods
        .cost()
        .call();
      setDisplayCost(web3.utils.fromWei(puCost));

      let puMax = await contract.methods
        .maxMintAmountPublic()
        .call();
      setMax(puMax);
    }






  }

  const getConfig = async () => {
    const configResponse = await fetch("/config/config.json", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const config = await configResponse.json();
    SET_CONFIG(config);
  };

  useEffect(() => {
    getConfig();
    getDataWithAlchemy();
  }, []);

  useEffect(() => {
    getData();
  }, [blockchain.account]);

  return (
    <>
      <s.Image src={"config/images/clouds_blue.svg"} style={{
        transform: "rotate(180deg)"
      }} />
      <s.FlexContainer jc={"center"} ai={"center"} fd={"row"}
        style={{
          background: "#3491F9"
        }}>
        <s.Mint>
          <s.TextTitle
            size={6.0}
            style={{
              letterSpacing: "3px",

            }}
          >
            MINT NOW
          </s.TextTitle>
          <s.SpacerSmall />
          <s.TextSubTitle size={1.4}>
            {CONFIG.MAX_SUPPLY - supply} of {CONFIG.MAX_SUPPLY} NFT's Available
          </s.TextSubTitle>
          <s.SpacerLarge />
          <s.SpacerLarge />

          <s.FlexContainer fd={"row"} ai={"center"} jc={"space-between"}>
            <s.TextTitle>Amount</s.TextTitle>

            <s.AmountContainer ai={"center"} jc={"center"} fd={"row"}>
              <StyledRoundButton
                style={{ lineHeight: 0.4 }}
                disabled={claimingNft ? 1 : 0}
                onClick={(e) => {
                  e.preventDefault();
                  decrementMintAmount();
                }}
              >
                -
              </StyledRoundButton>
              <s.SpacerMedium />
              <s.TextDescription color={"var(--primary)"} size={"2.5rem"}>
                {mintAmount}
              </s.TextDescription>
              <s.SpacerMedium />
              <StyledRoundButton
                disabled={claimingNft ? 1 : 0}
                onClick={(e) => {
                  e.preventDefault();
                  incrementMintAmount();
                }}
              >
                +
              </StyledRoundButton>
            </s.AmountContainer>

            <s.maxButton
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.preventDefault();
                maxNfts();
              }}
            >
              Max
            </s.maxButton>
          </s.FlexContainer>

          <s.SpacerSmall />
          <s.Line />
          <s.SpacerLarge />
          <s.FlexContainer fd={"row"} ai={"center"} jc={"space-between"}>
            <s.TextTitle>Total</s.TextTitle>
            <s.TextTitle color={"var(--primary)"}>{displayCost}</s.TextTitle>
          </s.FlexContainer>
          <s.SpacerSmall />
          <s.Line />
          <s.SpacerSmall />
          <s.SpacerLarge />
          {blockchain.account !== "" &&
            blockchain.smartContract !== null &&
            blockchain.errorMsg === "" ? (
            <s.Container ai={"center"} jc={"center"} fd={"row"}>
              <s.connectButton
                disabled={disable}
                onClick={(e) => {
                  e.preventDefault();
                  claimNFTs();
                  getData();
                }}
              >
                {" "}
                {claimingNft ? "Confirm Transaction in Wallet" : "Mint"}{" "}
                {mintDone ? feedback : ""}{" "}
              </s.connectButton>{" "}
            </s.Container>
          ) : (
            <>
              {/* {blockchain.errorMsg === "" ? ( */}
              <s.connectButton
                style={{
                  textAlign: "center",
                  color: "#fff",
                  cursor: "pointer",
                }}
                disabled={state == 0 ? 1 : 0}
                onClick={(e) => {
                  e.preventDefault();
                  dispatch(connectWallet());
                  getData();
                }}
              >
                Connect to Wallet
              </s.connectButton>
              {/* ) : ("")} */}
            </>
          )}
          <s.SpacerLarge />
          {blockchain.errorMsg !== "" ? (
            <s.connectButton
              style={{
                textAlign: "center",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {blockchain.errorMsg}
            </s.connectButton>
          ) : (
            ""
          )}

          {canMintOG !== true &&
            canMintWL !== true &&
            (state == 2 || state == 1) ? (
            <s.connectButton
              style={{
                textAlign: "center",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {feedback}
            </s.connectButton>
          ) : (
            ""
          )}
        </s.Mint>
      </s.FlexContainer>
      <s.Image src={"config/images/clouds_blue.svg"} />

    </>
  );
}

export default Home;
