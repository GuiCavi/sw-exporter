import React from "react";
import {
  Header,
  Divider,
  Dropdown,
  Button,
  Grid,
  Segment,
  Progress
} from "semantic-ui-react";
import { toLower, capitalize } from "lodash/string";

const { ipcRenderer, remote } = require("electron");

const config = remote.getGlobal("config");

import RealtimeCard from "../components/RealtimeCard";

class Logs extends React.Component {
  constructor() {
    super();
    this.state = {
      entries: [],
      files: [],
      isReading: false,
      runsData: {}
    };

    this.selectFile = this.selectFile.bind(this);
    this.processEntries = this.processEntries.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on("logrun", (event, message) => {
      this.setState({ entries: message }, () => this.processEntries());
    });

    ipcRenderer.on("files", (event, message) => {
      this.setState({ files: message }, () => this.processEntries());
    });

    ipcRenderer.on("readFile", (event, message) => {
      console.log("File content", message);

      this.setState(
        {
          isReading: false,
          entries: message
        },
        () => this.processEntries()
      );
    });

    const entries = ipcRenderer.sendSync("rtLogGetEntries");
    console.log("ENTRIES", entries);

    this.setState(
      {
        entries,
        files: ipcRenderer
          .sendSync("getFiles")
          .map(file => ({ key: file, value: file, text: file }))
      },
      () => this.processEntries()
    );
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners("logrun");
    ipcRenderer.removeAllListeners("files");
    ipcRenderer.removeAllListeners("readFile");
  }

  shouldComponentUpdate(nextProps, nextState) {
    // if (this.state.files.length !== nextState.files.length) { return true; }
    // if (this.state.entries.length === nextState.entries.length) { return false; }

    return true;
  }

  labelColor(logType) {
    switch (toLower(logType)) {
      case "win":
        return "purple";
      case "lost":
        return "orange";
      case "info":
        return "blue";
      case "success":
        return "green";
      case "warning":
        return "yellow";
      case "error":
        return "red";
      case "debug":
        return "black";
      default:
        return "grey";
    }
  }

  selectFile(e, { value }) {
    console.log("HELLO", value);

    this.setState({
      isReading: true
    });

    ipcRenderer.send("readFile", { fileName: value });
  }

  processEntries() {
    const giantRuns = this.state.entries.filter(entry =>
      entry.dungeon.includes("Giant's Keep")
    );
    const dragonRuns = this.state.entries.filter(entry =>
      entry.dungeon.includes("Dragon's Lair")
    );
    const necroRuns = this.state.entries.filter(entry =>
      entry.dungeon.includes("Necropolis")
    );

    const totalWin = this.state.entries.reduce((prev, curr) => {
      if (curr.result === "Win") return prev + 1;
      return prev;
    }, 0);
    const totalLost = this.state.entries.reduce((prev, curr) => {
      if (curr.result === "Lost") return prev + 1;
      return prev;
    }, 0);

    this.setState({
      runsData: {
        giantRunsSize: giantRuns.length,
        dragonRunsSize: dragonRuns.length,
        necroRunsSize: necroRuns.length,

        totalWin,
        totalLost
      }
    });
  }

  render() {
    // console.log("Entries", this.state.runsData);

    // const LogEntries = this.state.entries.map((entry, i) => {
    //   if (entry.type !== 'debug' || config.Config.App.debug) {
    //     return (<Feed key={i} className="log" size="small">
    //       <Feed.Event>
    //         <Feed.Content>
    //           <Feed.Summary>
    //             <Label size="mini" color={this.labelColor(entry.content.result)}>{capitalize(entry.content.result)}</Label>
    //             {capitalize(entry.content.dungeon)} {entry.name ? ` - ${entry.name}` : ''} <Feed.Date>{entry.date}</Feed.Date>
    //           </Feed.Summary>
    //           <Feed.Extra>
    //             {/* <div dangerouslySetInnerHTML={{ __html: entry.message }} /> */}
    //           </Feed.Extra>
    //         </Feed.Content>
    //       </Feed.Event>
    //       <Divider />
    //     </Feed>);
    //   }
    // });

    return (
      <div>
        <Header as="h1">Realtime</Header>

        <Divider />

        <Header as="h2">Realtime settings</Header>

        <Grid columns={4}>
          <Grid.Row>
            <Grid.Column>
              <Header as="h3">Choose one file</Header>

              <div style={{ display: "flex" }}>
                <Dropdown
                  fluid
                  labeled
                  search
                  placeholder="Select one file"
                  selection
                  options={this.state.files}
                  onChange={this.selectFile}
                  style={{
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    borderRightWidth: 0
                  }}
                />

                <Button
                  icon="refresh"
                  style={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    border: "1px solid #e0e1e2"
                  }}
                />
              </div>
            </Grid.Column>
          </Grid.Row>
        </Grid>

        <Divider />

        <Header as="h2">Overview</Header>

        <Grid columns={3}>
          <Grid.Row>
            <Grid.Column>
              <RealtimeCard
                backgroundImage="../assets/dungeons/giant.png"
                backgroundColor="#C1302B"
                value={this.state.runsData.giantRunsSize}
                textAfterValue="runs"
              />
            </Grid.Column>

            <Grid.Column>
              <RealtimeCard
                backgroundImage="../assets/dungeons/dragon.png"
                backgroundColor="#216AD2"
                value={this.state.runsData.dragonRunsSize}
                textAfterValue="runs"
              />
            </Grid.Column>
            <Grid.Column>
              <RealtimeCard
                backgroundImage="../assets/dungeons/necro.png"
                backgroundColor="#815192"
                value={this.state.runsData.necroRunsSize}
                textAfterValue="runs"
              />
            </Grid.Column>
          </Grid.Row>

          <Grid.Row columns={1}>
            <Grid.Column>
              <Segment>
                <Header as="h2">Total status</Header>
                <span>
                  Total runs = {this.state.entries.length}
                  <br />
                  Total wins = {this.state.runsData.totalWin}
                  <br />
                  Total lost = {this.state.runsData.totalLost}
                </span>

                <Progress
                  progress="value"
                  value={this.state.entries.length}
                  total={this.state.entries.length}
                />

                <Progress
                  progress="ratio"
                  value={this.state.runsData.totalWin}
                  total={this.state.entries.length}
                />
              </Segment>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </div>
    );
  }
}

module.exports = Logs;
