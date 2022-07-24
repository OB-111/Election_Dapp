import { Button, Modal } from 'react-bootstrap'

// voter book modal component
export default function VoterBookModal(props) {

    const handleClose = () => {
        props.setShowBook(false)
    }

    return (
        <Modal show={props.showBook} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Voter Book</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/** loops through the voters provided by the app and displays them in the modal */}
                {props.voters &&
                    props.voters.map((address, key) => {
                        return (
                            <p key={key}>{address}</p>
                        )
                    })
                }
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

