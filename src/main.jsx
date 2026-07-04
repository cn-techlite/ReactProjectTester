import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Play,
  RotateCcw,
} from "lucide-react";
import "./styles.css";

const endpointPath =
  "/api/bookings/initialize-paystack-accomodation-reservations-customer";
const apiBaseUrl = import.meta.env.DEV
  ? "/api-proxy"
  : "https://api-data-connection.ginilog.org";

const defaultToken = "";

const defaultPayload = {
  customerName: "Test Customer",
  customerPhoneNumber: "+2348000000000",
  customerEmail: "customer@example.com",
  numberOfGuests: "2",
  trnxReference: "eredxfcvccf",
  paymentChannel: "",
  paymentStatus: true,
  comment: "string",
  ticketClosed: true,
  reservationStartDate: "2026-09-24T14:31",
  reservationEndDate: "2026-10-26T14:31",
  noOfDays: "2",
  staffId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  staffName: "string",
  purchaseChannel: "string",
  userType: "Registred User",
};

const textFields = [
  { name: "customerName", label: "Customer name", type: "text" },
  { name: "customerPhoneNumber", label: "Phone number", type: "tel" },
  { name: "customerEmail", label: "Email address", type: "email" },
  { name: "numberOfGuests", label: "Number of guests", type: "number", min: 1 },
  { name: "trnxReference", label: "Transaction reference", type: "text" },
  { name: "paymentChannel", label: "Payment channel", type: "text" },
  {
    name: "reservationStartDate",
    label: "Reservation start",
    type: "datetime-local",
  },
  {
    name: "reservationEndDate",
    label: "Reservation end",
    type: "datetime-local",
  },
  { name: "noOfDays", label: "Number of days", type: "number", min: 1 },
  { name: "staffId", label: "Staff ID", type: "text" },
  { name: "staffName", label: "Staff name", type: "text" },
  { name: "purchaseChannel", label: "Purchase channel", type: "text" },
  { name: "userType", label: "User type", type: "text" },
];

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function normalizeDateTime(value) {
  return value && value.length === 16 ? `${value}:00` : value;
}

function buildPayload(form) {
  return {
    ...form,
    numberOfGuests: Number(form.numberOfGuests),
    noOfDays: Number(form.noOfDays),
    reservationStartDate: normalizeDateTime(form.reservationStartDate),
    reservationEndDate: normalizeDateTime(form.reservationEndDate),
  };
}

function App() {
  const [reservationId, setReservationId] = useState(
    "7d7e35ea-09f0-4433-935b-0d4c5ed19dcf",
  );
  const [token, setToken] = useState(defaultToken);
  const [form, setForm] = useState(defaultPayload);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const jwtDetails = useMemo(() => {
    const decoded = parseJwt(token.trim());
    if (!decoded?.exp) {
      return { decoded, label: "Token expiry unavailable", expired: false };
    }

    const expiresAt = new Date(decoded.exp * 1000);
    return {
      decoded,
      label: `Token expires ${expiresAt.toLocaleString()}`,
      expired: Date.now() > expiresAt.getTime(),
    };
  }, [token]);

  const requestUrl = `${apiBaseUrl}${endpointPath}`;
  const requestBody = useMemo(() => buildPayload(form), [form]);
  const checkoutUrl =
    typeof response?.data === "object" ? response.data?.data?.authorizationUrl : "";

  function updateFormValue(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function sendRequest() {
    setLoading(true);
    setResponse(null);
    const checkoutWindow = window.open("about:blank", "_blank");

    try {
      const startedAt = performance.now();
      const result = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          reservationId,
          ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });
      const elapsedMs = Math.round(performance.now() - startedAt);
      const contentType = result.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await result.json()
        : await result.text();

      setResponse({
        ok: result.ok,
        status: result.status,
        statusText: result.statusText,
        elapsedMs,
        data,
      });

      const authorizationUrl =
        typeof data === "object" ? data?.data?.authorizationUrl : "";

      if (authorizationUrl && checkoutWindow) {
        checkoutWindow.location.href = authorizationUrl;
      } else if (checkoutWindow) {
        checkoutWindow.close();
      }
    } catch (error) {
      if (checkoutWindow) {
        checkoutWindow.close();
      }
      setResponse({
        ok: false,
        status: "Client error",
        statusText: error.name,
        elapsedMs: 0,
        data: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyCurl() {
    const command = [
      `curl --location '${requestUrl}'`,
      `--header 'reservationId: ${reservationId}'`,
      token.trim() ? `--header 'Authorization: Bearer ${token.trim()}'` : "",
      "--header 'Content-Type: application/json'",
      `--data-raw '${prettyJson(requestBody)}'`,
    ]
      .filter(Boolean)
      .join(" \\\n  ");

    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function resetPayload() {
    setForm(defaultPayload);
    setResponse(null);
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Paystack Accommodation Reservation</p>
          <h1>Booking Endpoint Tester</h1>
        </div>
        <button className="primary-button" onClick={sendRequest} disabled={loading}>
          <Play size={18} />
          {loading ? "Sending..." : "Send Request"}
        </button>
      </section>

      <section className="status-strip">
        <div>
          <span>Method</span>
          <strong>POST</strong>
        </div>
        <div>
          <span>Backend</span>
          <strong>api-data-connection.ginilog.org</strong>
        </div>
        <div className={jwtDetails.expired ? "warning" : ""}>
          <span>JWT</span>
          <strong>{jwtDetails.label}</strong>
        </div>
      </section>

      <section className="workspace">
        <form
          className="panel request-panel"
          onSubmit={(event) => {
            event.preventDefault();
            sendRequest();
          }}
        >
          <div className="panel-heading">
            <h2>Reservation form</h2>
            <div className="button-row">
              <button type="button" className="icon-button" onClick={copyCurl} title="Copy curl">
                <Copy size={17} />
              </button>
              <button type="button" className="icon-button" onClick={resetPayload} title="Reset body">
                <RotateCcw size={17} />
              </button>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Endpoint
              <input value={requestUrl} readOnly />
            </label>

            <label>
              reservationId header
              <input
                value={reservationId}
                onChange={(event) => setReservationId(event.target.value)}
              />
            </label>
          </div>

          <label>
            Bearer token
            <textarea
              className="token-area"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              spellCheck="false"
            />
          </label>

          <div className="form-grid">
            {textFields.map((field) => (
              <label key={field.name}>
                {field.label}
                <input
                  type={field.type}
                  min={field.min}
                  value={form[field.name]}
                  onChange={(event) => updateFormValue(field.name, event.target.value)}
                />
              </label>
            ))}
          </div>

          <label>
            Comment
            <textarea
              className="comment-area"
              value={form.comment}
              onChange={(event) => updateFormValue("comment", event.target.value)}
            />
          </label>

          <div className="checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.paymentStatus}
                onChange={(event) => updateFormValue("paymentStatus", event.target.checked)}
              />
              Payment status
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.ticketClosed}
                onChange={(event) => updateFormValue("ticketClosed", event.target.checked)}
              />
              Ticket closed
            </label>
          </div>

          <button className="primary-button submit-button" type="submit" disabled={loading}>
            <Play size={18} />
            {loading ? "Sending..." : "Create checkout"}
          </button>
        </form>

        <aside className="panel response-panel">
          <div className="panel-heading">
            <h2>Response</h2>
            {response && (
              <span className={response.ok ? "badge success" : "badge error"}>
                {response.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {response.status}
              </span>
            )}
          </div>

          {!response ? (
            <div className="empty-state">
              <Play size={32} />
              <p>Send the request to see status, timing, and response body here.</p>
            </div>
          ) : (
            <>
              <div className="metrics">
                <div>
                  <span>Status</span>
                  <strong>
                    {response.status} {response.statusText}
                  </strong>
                </div>
                <div>
                  <span>Time</span>
                  <strong>{response.elapsedMs} ms</strong>
                </div>
              </div>

              {checkoutUrl && (
                <a
                  className="checkout-link"
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={18} />
                  Open Paystack checkout
                </a>
              )}

              <pre className="response-body">
                {typeof response.data === "string"
                  ? response.data
                  : prettyJson(response.data)}
              </pre>
            </>
          )}

          {copied && <p className="copy-toast">curl command copied</p>}
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
