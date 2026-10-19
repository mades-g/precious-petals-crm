package main

import "fmt"

var (
	buildVersion = "dev"
	buildCommit  = "unknown"
	buildTime    = "unknown"
)

func buildInfoLogLine() string {
	return fmt.Sprintf(
		"INFO: precious-petals-crm build version=%s commit=%s builtAt=%s",
		buildVersion,
		buildCommit,
		buildTime,
	)
}
