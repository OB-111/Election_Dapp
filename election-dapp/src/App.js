import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Card, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import mainContractAbi from './constants/MainContract.json';
import electionAbi from './constants/Election.json';
import voteNftAbi from './constants/VoteNFT.json';
import tokenAbi from './constants/RewardToken.json';
import mainContractAddress from './constants/address.json';
import { ethers } from 'ethers';
import VoterBookModal from './components/VoterBookModal'
import PolledVoteModal from './components/PolledVoteModal'
import CustomNavbar from './components/CustomNavbar';

function App() {

  const [account, setAccount] = useState("");
  const [electionDetails, setElectionDetails] = useState({});
  const [newVoterAddress, setNewVoterAddress] = useState("");

  const [electionList, setElectionList] = useState([]);

  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedElectionRemaining, setSelectedElectionRemaining] = useState(0);

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [mainContract, setMainContract] = useState(null);
  const [nftContract, setNftContract] = useState(null);

  const [voterStatus, setVoterStatus] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);

  const [showVoterBook, setShowVoterBook] = useState(false);

  const [showPollModal, setShowPollModal] = useState(false);
  const [currentPoll, setCurrentPoll] = useState({});
  const [newPollDetails, setNewPollDetails] = useState({});

  const [regularCandidateId, setRegularCandidateId] = useState(2);
  const handleCandidateIdChange = (e) => { setRegularCandidateId(e.target.value) }


  // re render hook
  useEffect(() => {
    const init = async () => {
      await connectWallet()
    }
    init();
  }, []);

  useEffect(() => {
    if (selectedElectionRemaining !== 0) {
      const timer = setInterval(() => {
        let remaining = selectedElectionRemaining - 1
        if (remaining <= 1) {
          window.location.reload()
        }
        setSelectedElectionRemaining(remaining)
      }, 1000)

      return () => {
        clearInterval(timer)
      }
    }
  });

  // this functions connects the wallet using metamask ethereum window
  const connectWallet = async () => {
    if (window.ethereum) {
      await window.ethereum.request({ method: 'eth_requestAccounts' }).then((res) => {
        let accountNew = res[0]
        accountHandler(accountNew)
      })
    } else {
      alert("Install metamask")
    }
  }

  // this function is called when wallet is connected to handle state settings
  const accountHandler = (newAcc) => {
    setAccount(newAcc)
    loadEthersProperties(newAcc)
  }

  const loadEthersProperties = async (newAcc) => {
    // ethers provider to make calls
    let tempProvider = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(tempProvider);

    // ethers signer to make transactions
    let tempSigner = tempProvider.getSigner();
    setSigner(tempSigner);

    // our main contract, which is the factory of elections
    let tempMainContract = new ethers.Contract(mainContractAddress, mainContractAbi, tempSigner);
    setMainContract(tempMainContract);

    // our nft contract, which we later on call to give voter status to addresses
    let nftContractAddress = await tempMainContract.nft()
    let tempNftContract = new ethers.Contract(nftContractAddress, voteNftAbi, tempSigner)
    setNftContract(tempNftContract)

    let nftBalance = await tempNftContract.balanceOf(newAcc)
    setVoterStatus(nftBalance > 0)

    let tokenContractAddress = await tempMainContract.token()
    let tempTokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, tempSigner)

    let tokenBalance = await tempTokenContract.balanceOf(newAcc)
    setTokenBalance(tokenBalance)

    // looping the election id and gettings infos of all elections
    let _electionId = await tempMainContract.electionId();
    let eList = []
    for (let i = 0; i < _electionId; i++) {
      let allInfo = []
      let addressOfElection = await tempMainContract.Elections(i);
      allInfo.push(addressOfElection)

      let electionContract = new ethers.Contract(addressOfElection, electionAbi, tempSigner);
      let name = await electionContract.name();
      let desc = await electionContract.description();

      allInfo.push(name, desc)

      for (let i = 0; i < 2; i++) {
        let candidate = await electionContract.candidates(i)
        allInfo.push(candidate.name)
        allInfo.push(candidate.voteCount)
      }

      let voterCount = await electionContract.voterCount();
      let voterList = []
      for (let i = 0; i < voterCount; i++) {
        let currentVoter = await electionContract.voterGet(i)
        voterList.push(currentVoter)
      }
      allInfo.push(voterList)

      allInfo.push(electionContract)

      let startedAt = await electionContract.startDate()
      let electionLength = await electionContract.ELECTION_LENGTH()
      let isEnded = startedAt.toNumber() + electionLength.toNumber() < Date.now() / 1000

      allInfo.push(isEnded)

      if (!isEnded) {
        let remaining = startedAt.toNumber() + electionLength.toNumber() - Date.now() / 1000
        allInfo.push(remaining)
      } else {
        allInfo.push(0)
        let winner = await electionContract.winner()
        allInfo.push(winner.name)
      }
      eList.push(allInfo)
    }
    setElectionList(eList)
  }

  // this will set the state to the new value when a textbox in election creation is changed
  const handleDetailChange = (key, event) => {
    setElectionDetails({ ...electionDetails, [key]: event.target.value })
  }

  const handleNewPollChange = (key, event) => {
    setNewPollDetails({ ...newPollDetails, [key]: event.target.value })
  }

  // creates an election with the user provided details
  const createElection = async () => {
    try {
      if (electionDetails.intervalBefore > 0) {
        const tx = await mainContract.populateTransaction.createElection([electionDetails.name, electionDetails.desc], [electionDetails.candidate1, electionDetails.candidate2], electionDetails.length)
        alert(`The creation transaction will be sent in ${electionDetails.intervalBefore} seconds!`)
        setTimeout(async () => {
          let sentTx = await signer.sendTransaction(tx)
          await sentTx.wait()
          window.location.reload()
        }, electionDetails.intervalBefore * 1000)
        return
      }
      const tx = await mainContract.createElection([electionDetails.name, electionDetails.desc], [electionDetails.candidate1, electionDetails.candidate2], electionDetails.length)
      await tx.wait()
      window.location.reload()
      return
    } catch (err) {
      alert("Error: " + !!err.reason ? err.message : err.reason)
    }

  }

  const endElection = async (eContract) => {
    try {
      let tx = await eContract.endElection()
      await tx.wait()
      window.location.reload()
    } catch (err) {
      alert("Error: " + !!err.reason ? err.message : err.reason)
    }
  }

  // this will set the state to the new value when the new voter address textbox is changed
  const handleVoterAddressForm = (e) => {
    setNewVoterAddress(e.target.value)
  }

  // this function makes a call to the nft contract and mints an vote nft for the new voter
  const giveVoterStatus = async () => {
    try {
      let tx = await nftContract.giveVoterStatus(newVoterAddress, "");
      await tx.wait()
      window.location.reload()
    } catch (err) {
      alert("Error: " + !!err.reason ? err.message : err.reason)
    }
  }

  // this sets the selected election in the voting part
  const handleSelectedElection = (e) => {
    setSelectedElection(e)
    setSelectedElectionRemaining(e[10])
  }

  // lets the voter vote regularly
  const voteRegularly = async () => {
    try {
      let tx = await selectedElection[8].vote(regularCandidateId)
      await tx.wait()
      window.location.reload()
    } catch (err) {
      alert("Error: " + !!err.reason ? err.message : err.reason)
    }
  }

  // same function with vote but receives a candidateId from PolledVoteModal
  const votePolled = async (candidateId) => {
    try {
      let tx = await selectedElection[8].vote(candidateId)
      await tx.wait()
      window.location.reload()
    } catch (err) {
      alert("Error: " + !!err.reason ? err.message : err.reason)
    }
  }

  // Gets a random poll of the selected election
  const getRandomPoll = () => {
    try {
      const electionStorage = JSON.parse(localStorage.getItem(selectedElection[1]))
      var keys = Object.keys(electionStorage);
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      setCurrentPoll(electionStorage[randomKey])
      return electionStorage[randomKey];
    } catch (err) {
      alert("Error: " + err.message)
    }

  }

  const createQuestion = () => {
    try {
      const randomElectionId = Math.floor(Math.random() * 100).toString()
      let randObject = { ...JSON.parse(localStorage.getItem(newPollDetails.election)) }
      randObject[randomElectionId] = newPollDetails
      localStorage.setItem(newPollDetails.election, JSON.stringify(randObject))
      window.location.reload()
    } catch (err) {
      alert("Error: " + err.message)
    }
  }

  const remainingTimeHandler = () => {
    var date = new Date(0);
    date.setSeconds(selectedElectionRemaining);
    var timeString = date.toISOString().substr(11, 8);
    return timeString
  }

  window.ethereum.on("accountsChanged", () => {
    window.location.reload()
  })

  return (
    <div className="App">
      <CustomNavbar account={account} voterStatus={voterStatus} connectWallet={connectWallet} />
      <header className="App-header">
        <Row>
          <Col>
            <Card className="header-card">
              <Card.Header>
                Create Election
              </Card.Header>

              <Form className="election-form">
                <Form.Label>Name</Form.Label>
                <Form.Control onChange={e => {
                  handleDetailChange("name", e)
                }}></Form.Control>
                <Form.Label>Description</Form.Label>
                <Form.Control onChange={e => {
                  handleDetailChange("desc", e)
                }}></Form.Control>
                <Form.Label>Candidate 1</Form.Label>
                <Form.Control onChange={e => {
                  handleDetailChange("candidate1", e)
                }}></Form.Control>
                <Form.Label>Candidate 2</Form.Label>
                <Form.Control onChange={e => {
                  handleDetailChange("candidate2", e)
                }}></Form.Control>
                <Form.Label>Interval Before Election</Form.Label>
                <Form.Control type="number" onChange={e => {
                  handleDetailChange("intervalBefore", e)
                }}></Form.Control>
                <Form.Label>Time Length in Seconds</Form.Label>
                <Form.Control type="number" onChange={e => {
                  handleDetailChange("length", e)
                }}></Form.Control>
                <Button className="create-button" onClick={createElection} disabled={account ? false : true}>
                  Create Election
                </Button>

              </Form>
            </Card>
          </Col>
          <Col>

            <Card className="header-card">
              <Card.Header>
                Election Admin
              </Card.Header>

              <Form className="election-form">
                <Form.Label>Poll election name</Form.Label>
                <Form.Control onChange={(e) => handleNewPollChange("election", e)} />
                <Form.Label>Poll question</Form.Label>
                <Form.Control onChange={(e) => handleNewPollChange("question", e)} />
                <Form.Label>Poll Candidate 1 opinion</Form.Label>
                <Form.Control onChange={(e) => handleNewPollChange("0", e)} />
                <Form.Label>Poll Candidate 2 opinion</Form.Label>
                <Form.Control onChange={(e) => handleNewPollChange("1", e)} />
                <Button className="create-button" onClick={createQuestion} disabled={account ? false : true}>
                  Create Poll Question
                </Button>
                <hr />
              </Form>

              <Form className='election-form' style={{ marginTop: 0 }}>
                <Form.Label>
                  New Voter Address
                </Form.Label>
                <Form.Control onChange={e => {
                  handleVoterAddressForm(e)
                }}>
                </Form.Control>
                <Button className="create-button" onClick={giveVoterStatus} disabled={account ? false : true}>
                  Give Voter Status
                </Button>
              </Form>
            </Card>
          </Col>
          <Col>
            <Card className="header-card">
              <Card.Header>
                Election List
              </Card.Header>
              {account && electionList.map((election, key) => {
                return (
                  <Alert key={key} variant={election[9] ? "danger" : "primary"}
                    onClick={!election[9] ? (e) => { handleSelectedElection(election) } : (e) => {
                      if (e.target !== e.currentTarget) return;
                      alert("This election has ended!")
                    }}
                    className="detail-election">
                    {election[1]}<br />
                    {election[2]}<br />
                    {!!election[11] && (
                      <>
                        Winner: {election[11]}
                      </>
                    )}<hr />
                    {'0: ' + election[3] + ` | Votes: ${election[4]}`}<br />
                    {'1: ' + election[5] + ` | Votes: ${election[6]}`}<hr />
                    <Button className="create-button" onClick={() => { endElection(election[8]) }} disabled={!(election[11] === "")}>
                      End Election
                    </Button>
                  </Alert>

                )
              })}
            </Card>
          </Col>
          <Col>
            <Card className="header-card">
              <Card.Header>
                Vote
              </Card.Header>
              <Form className="election-form">
                {selectedElection && (
                  <>
                    <Form.Label>
                      {selectedElection ? `Election: ${selectedElection[1]}` : ""}<br />
                    </Form.Label><br />
                  </>
                )}


                {selectedElectionRemaining !== 0 && (
                  <>
                    <Form.Label>
                      Remaining: {remainingTimeHandler()}
                    </Form.Label>
                    <br />
                  </>
                )}

                <Form.Label>
                  {`Reward Token Balance: ${ethers.utils.formatEther(tokenBalance)}`}<br />
                </Form.Label><br />

                <Button className="create-button" onClick={() => setShowVoterBook(true)} disabled={selectedElection ? false : true}>
                  See Voter Book
                </Button>
                <hr />
                <Form.Control placeholder="Enter candidate ID" onChange={(e) => handleCandidateIdChange(e)} />
                <Button className="create-button" onClick={voteRegularly} disabled={selectedElection ? false : true}>
                  Vote Regularly
                </Button>
                <hr />
                <Button className="create-button" onClick={() => {
                  getRandomPoll()
                  setShowPollModal(true)
                }} disabled={selectedElection ? false : true}>
                  Vote with Poll
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>

        {selectedElection && <VoterBookModal voters={selectedElection[7]} showBook={showVoterBook} setShowBook={setShowVoterBook}></VoterBookModal>}
        {selectedElection && <PolledVoteModal vote={votePolled} getRandomPoll={getRandomPoll} randomPoll={currentPoll} showPollModal={showPollModal} setShowPollModal={setShowPollModal}></PolledVoteModal>}
      </header>
    </div >
  );
}

export default App;
