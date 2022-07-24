import { Navbar, Container, Button } from 'react-bootstrap'

// navbar component
export default function CustomNavbar(props) {
    return (
        <Navbar bg="light" expand="lg" sticky="top">
            <Container>
                <Navbar.Brand href="#home">Election</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Text>{props.account} - Voter Status: {props.voterStatus ? "🟢" : "🔴"}</Navbar.Text>
                <Button className="create-button" onClick={props.connectWallet} disabled={props.account ? true : false}>
                    Connect Wallet
                </Button>
            </Container>
        </Navbar>
    )
}