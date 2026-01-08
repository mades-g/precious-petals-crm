# ---------- build custom pocketbase ----------
FROM golang:1.23-alpine AS builder

WORKDIR /src

RUN apk add --no-cache git ca-certificates

# go deps
COPY go.mod go.sum ./
RUN go mod download

# copy only what's needed to build
COPY main.go ./

# build custom PB binary
RUN go build -o /precious-petals-crm .

# ---------- runtime ----------
FROM alpine:latest

RUN apk add --no-cache \
    ca-certificates \
    openssh \
    wkhtmltopdf \
    ttf-dejavu \
    fontconfig

WORKDIR /pb

# custom pocketbase binary
COPY --from=builder /precious-petals-crm /pb/precious-petals-crm

# runtime assets only
COPY ./pb_hooks /pb/pb_hooks
COPY ./pb_public /pb/pb_public

EXPOSE 8080

ENV INVOICE_PDF_BIN=wkhtmltopdf

CMD ["/pb/precious-petals-crm", "serve", "--http=0.0.0.0:8080"]
