FROM golang:1.25-alpine AS builder

WORKDIR /src
RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY main.go ./
RUN go build -o /precious-petals-crm .

FROM surnet/alpine-wkhtmltopdf:3.20.3-0.12.6-full

RUN apk add --no-cache \
    ca-certificates \
    openssh \
    ttf-dejavu \
    fontconfig

WORKDIR /pb

COPY --from=builder /precious-petals-crm /pb/precious-petals-crm
COPY ./pb_hooks /pb/pb_hooks
COPY ./pb_public /pb/pb_public

EXPOSE 8080

ENV INVOICE_PDF_BIN=wkhtmltopdf

# Resets entry point
ENTRYPOINT []

CMD ["/pb/precious-petals-crm", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data"]
