# Decision records

Decision records preserve the context and rationale for materially consequential product, architecture, security, data, provider, and operational choices.

## Rules

- Create records as **ADR-NNNN-short-title.md** using the next sequential number.
- Do not rename or rewrite historical records. Supersede or amend them with a new linked record.
- Every record must contain the headings **Context**, **Problem**, **Options**, **Decision**, **Reasoning**, and **Consequences**.
- Every record must declare exactly one status: **Proposed**, **Accepted**, **Open**, or **Deferred**.
- A status of Proposed, Open, or Deferred is not permission to implement the choice as final.

## Template

Copy the following headings into the next record; retain unknowns explicitly.

    # ADR-NNNN: Title

    - **Status:** Proposed | Accepted | Open | Deferred
    - **Date:** YYYY-MM-DD
    - **Owners:** Name/team
    - **Related:** Links

    ## Context

    ## Problem

    ## Options

    1. Option and implications.

    ## Decision

    ## Reasoning

    ## Consequences

    ### Positive

    ### Negative / risks

    ### Follow-up
