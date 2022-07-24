import { useState } from 'react'
import { Button, Modal } from 'react-bootstrap'

// polled vote modal component
export default function PolledVoteModal(props) {

    const [currentPollSelections, setCurrentPollSelections] = useState([])
    const [currentPollSelectionCount, setCurrentPollSelectionCount] = useState(0)
    const [alreadyAsked, setAlreadyAsked] = useState([])

    function mode(arr) {
        return arr.sort((a, b) =>
            arr.filter(v => v === a).length
            - arr.filter(v => v === b).length
        ).pop();
    }

    const handleClose = () => {
        props.setShowPollModal(false)
        setCurrentPollSelections([])
        setCurrentPollSelectionCount(0)
        setAlreadyAsked([])
    }

    const handlePoolSelections = (newChoice) => {
        let selectionsAppended = [...currentPollSelections, newChoice]
        setCurrentPollSelections(selectionsAppended)

        let newCount = currentPollSelectionCount + 1
        setCurrentPollSelectionCount(newCount)

        let alreadyAskedQuestions = [...alreadyAsked, props.randomPoll["question"]]
        setAlreadyAsked(alreadyAskedQuestions)

        if (newCount === 4) {
            const mostUsedValue = mode(selectionsAppended)
            props.vote(mostUsedValue)
            handleClose()
            return
        }

        while (true) {
            let newQuestion = props.getRandomPoll()
            if (!(alreadyAskedQuestions.indexOf(newQuestion["question"]) > -1)) {
                break
            }
        }
    }

    return (
        <Modal show={props.showPollModal} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>{props.randomPoll["question"]}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Button className="create-button" onClick={() => {
                    handlePoolSelections("0")
                }}>{props.randomPoll["0"]}</Button><br />
                <Button className="create-button" onClick={() => {
                    handlePoolSelections("1")
                }}>{props.randomPoll["1"]}</Button><br />
            </Modal.Body>
        </Modal>
    );
}