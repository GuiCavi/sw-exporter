import React from "react";
import { Segment } from "semantic-ui-react";

const RealtimeCard = props => (
  <Segment
    style={{
      backgroundImage: `url(${props.backgroundImage})`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "-10% center",
      backgroundSize: "contain",
      height: 130,
      backgroundColor: props.backgroundColor,
      borderRadius: 10,
      borderWidth: 0,
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center"
    }}
  >
    <span
      style={{
        fontSize: 40,
        textAlign: "right",
        lineHeight: 1,
        color: "white",
        textShadow: "0 1px 2px rgba(51,51,51,1)"
      }}
    >
      {props.value}
      <br />
      {props.textAfterValue}
    </span>
  </Segment>
);

export default RealtimeCard;
