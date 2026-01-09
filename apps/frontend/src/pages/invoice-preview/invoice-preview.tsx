import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { useLocation, useNavigate } from "react-router";
import { pb } from "@/services/pb/client";

type LocationState = {
  payload?: unknown;
};

const A4_WIDTH_PX = 794; // ~ 210mm at 96dpi
const A4_HEIGHT_PX = 1123; // ~ 297mm at 96dpi

const InvoicePreview: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? null;
  const previewKey = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("previewKey");
  }, [location.search]);

  const [payload, setPayload] = useState<unknown>(state?.payload);

  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string>("");

  // container used to compute scaling
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!previewKey) return;
    try {
      const stored = sessionStorage.getItem(previewKey);
      if (stored) setPayload(JSON.parse(stored));
    } catch {
      setPayload(undefined);
    } finally {
      try {
        sessionStorage.removeItem(previewKey);
      } catch {
        // ignore
      }
    }
  }, [previewKey]);

  const canPreview = useMemo(() => {
    return !!payload && !!pb.authStore.token && typeof pb.baseUrl === "string";
  }, [payload]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!canPreview) return;

      setError("");
      setHtml("");

      try {
        const res = await fetch(`${pb.baseUrl}/api/invoice/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify(payload),
        });

        const text = await res.text();

        if (!res.ok) {
          try {
            const j = JSON.parse(text) as any;
            const msg =
              j?.details ||
              j?.error ||
              j?.message ||
              `Preview failed (${res.status})`;
            throw new Error(msg);
          } catch {
            throw new Error(text || `Preview failed (${res.status})`);
          }
        }

        if (!cancelled) setHtml(text);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load preview");
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [canPreview, payload]);

  // Compute scale so A4 fits inside the available viewport width (with padding)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const compute = () => {
      const rect = el.getBoundingClientRect();
      // allow some padding inside viewport
      const availableWidth = Math.max(0, rect.width - 32);
      const next =
        availableWidth > 0 ? Math.min(1, availableWidth / A4_WIDTH_PX) : 1;
      setScale(next);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);

    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  if (!payload) {
    return (
      <Box p="4" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Card>
          <Heading size="4" mb="2">
            Invoice preview
          </Heading>
          <Text color="gray" size="2">
            Missing payload. Go back and click “Preview invoice” again.
          </Text>
          <Flex mt="3">
            <Button variant="soft" onClick={() => navigate(-1)}>
              ← Back
            </Button>
          </Flex>
        </Card>
      </Box>
    );
  }

  return (
    <Box p="4" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Flex justify="between" align="center" mb="3">
        <Heading size="4">Invoice preview</Heading>
        <Button variant="soft" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      </Flex>

      {error ? (
        <Card>
          <Text color="red" size="2">
            {error}
          </Text>
        </Card>
      ) : html ? (
        <Card
          ref={viewportRef}
          style={{
            padding: 16,
            overflow: "auto",
            background: "var(--gray-a2)",
          }}
        >
          <Box
            style={{
              width: A4_WIDTH_PX,
              height: A4_HEIGHT_PX,
              margin: "0 auto",
              background: "#fff",
              borderRadius: 8,
              boxShadow:
                "0 6px 22px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
          >
            <iframe
              title="Invoice preview"
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                display: "block",
                background: "#fff",
              }}
              srcDoc={html}
            />
          </Box>

          <Box style={{ height: Math.max(0, (1 - scale) * A4_HEIGHT_PX) }} />
        </Card>
      ) : (
        <Card>
          <Text color="gray" size="2">
            Loading preview...
          </Text>
        </Card>
      )}
    </Box>
  );
};

export default InvoicePreview;
