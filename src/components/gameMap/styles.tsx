"use client";

import { styled } from "@mui/material/styles";

export const GameMapContainer = styled("div")(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "100vh",

  "& .game-map": {
    width: "100%",
    height: "100%",
  },

  "& .loading-container": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    flexDirection: "column",
    gap: "16px",
    backgroundColor: theme.palette.background.default,
  },

  "& .error-container": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#ffebee",
    padding: "16px",
  },

  "& .instructions-container": {
    position: "absolute",
    top: "16px",
    left: "16px",
    zIndex: 10,
    padding: "16px",
    maxWidth: "280px",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(8px)",
    borderRadius: "8px",
    boxShadow: theme.shadows[4],
  },

  "& .instructions-title": {
    fontWeight: 600,
    marginBottom: "8px",
    color: theme.palette.primary.main,
  },

  "& .instructions-list": {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },

  "& .instructions-item": {
    fontSize: "12px",
    marginBottom: "4px",
    color: theme.palette.text.secondary,
    display: "flex",
    alignItems: "center",
    "&:before": {
      content: '"•"',
      color: theme.palette.primary.main,
      marginRight: "8px",
      fontWeight: "bold",
    },
  },

  [theme.breakpoints.down("md")]: {
    "& .instructions-container": {
      top: "8px",
      left: "8px",
      maxWidth: "240px",
    },
    "& .instructions-title": {
      fontSize: "12px",
    },
    "& .instructions-item": {
      fontSize: "10px",
    },
  },
}));
