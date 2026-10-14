export const securityControls = [
  {
    id: "permission",
    code: "01",
    label: "Permission",
    title: "A target stays out until you confirm it.",
    summary:
      "Adding a system asks you to confirm you are allowed to test it. The server rejects the target when that confirmation is missing.",
    points: [
      "The confirmation is checked on the server, not only in the form.",
      "The target is stored on the account that added it.",
      "A check runs against a target already in your scope.",
    ],
  },
  {
    id: "accounts",
    code: "02",
    label: "Accounts",
    title: "Passwords are hashed. Sessions expire.",
    summary:
      "A password is stored with scrypt, a slow hash, and checked in constant time. A session is a signed token that expires after seven days.",
    points: [
      "Passwords need at least 8 characters.",
      "The server refuses to sign sessions when the signing secret is missing.",
      "Sign-in attempts are limited, so guessing is slowed down.",
    ],
  },
  {
    id: "records",
    code: "03",
    label: "Your records",
    title: "Results load for the signed-in account.",
    summary:
      "Targets, checks, problems, and reports are read for the account that owns them. Public pages do not show those records.",
    points: [
      "Another account’s API calls do not receive your targets or reports.",
      "A report is built from your own results.",
      "Missing research or threat connections say they are not set up.",
    ],
  },
  {
    id: "limits",
    code: "04",
    label: "Limits",
    title: "Noisy actions are capped.",
    summary:
      "Sign-in, name and company research, and assistant actions each have a limit per window. A check still starts when you start it.",
    points: [
      "Sign-in is limited to 10 attempts in five minutes.",
      "Name and company research is limited to six requests a minute.",
      "Assistant chat and actions have their own limits.",
    ],
  },
  {
    id: "checks",
    code: "05",
    label: "The check",
    title: "A security check starts when you start it.",
    summary:
      "You confirm a target, run the check, read the problems, see what they mean, and keep a report. Ardi waits for that request.",
    points: [
      "Research, test, fix, and report stay in that order inside the workspace.",
      "Problems are evidence to review, with severity and context.",
      "The report lists what was tested and what came back.",
    ],
  },
  {
    id: "privacy",
    code: "06",
    label: "Privacy",
    title: "Account information has its own page.",
    summary:
      "The privacy page describes the account details, targets, findings, reports, and messages the workspace is built to process.",
    points: [
      "Workspace records are for the signed-in account.",
      "Privacy requests are explained on the privacy page.",
      "Cookie storage is explained on the cookies page.",
    ],
  },
] as const;

export const securityQuestions = [
  {
    question: "Where are workspace records stored?",
    answer:
      "Targets, checks, problems, and reports are stored for the signed-in account on the service that runs Ardi.",
  },
  {
    question: "Can another customer open my results?",
    answer:
      "The API loads targets, checks, problems, and reports for the signed-in account. Public pages leave those records off.",
  },
  {
    question: "Do you need my source code or deployment pipeline?",
    answer:
      "You add a target you are allowed to test. The check runs against that target.",
  },
  {
    question: "What happens if I skip the permission confirmation?",
    answer:
      "The server rejects the target. It does not enter your scope, and a check has nothing authorised to run against.",
  },
  {
    question: "How are passwords and session tokens handled?",
    answer:
      "Passwords are hashed with scrypt. Session tokens are signed, expire after seven days, and the signing secret stays on the server.",
  },
  {
    question: "Does a scan start on its own?",
    answer:
      "A check starts when you start it against a target you already confirmed.",
  },
  {
    question: "What if name research or the threat feed is not connected?",
    answer:
      "The page says the connection is not set up. Ardi leaves the result empty instead of filling in a guess.",
  },
  {
    question: "Is this page a compliance certificate?",
    answer:
      "An auditor issues a compliance certificate. This page explains accounts, permission, and how results stay with your account. The privacy page covers account information.",
  },
] as const;
