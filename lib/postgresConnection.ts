import fs from "node:fs";
import path from "node:path";

const SSL_QUERY_PARAMS = [
	"sslmode",
	"sslrootcert",
	"sslcert",
	"sslkey",
	"pgbouncer",
];

/**
 * Build pg connection options with Supabase CA verification.
 * SSL query params are removed because node-postgres replaces an explicit
 * `ssl` object when those params are present in the connection string.
 */
export function getPostgresConnectionOptions(
	rawUrl = process.env.DATABASE_URL,
	options: { forceSessionPort?: boolean } = {},
) {
	if (!rawUrl) throw new Error("DATABASE_URL is not set");

	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL");
	}
	if (options.forceSessionPort && url.port === "6543") {
		url.port = "5432";
	}
	for (const param of SSL_QUERY_PARAMS) {
		url.searchParams.delete(param);
	}

	const certificatePath = path.resolve(
		process.env.SUPABASE_CA_CERT_PATH ||
			path.join(process.cwd(), "prod-ca-2021.crt"),
	);
	let ca: string;
	try {
		ca = fs.readFileSync(certificatePath, "utf8");
	} catch {
		throw new Error(
			`Supabase CA certificate not found at ${certificatePath}. ` +
				"Set SUPABASE_CA_CERT_PATH or add prod-ca-2021.crt.",
		);
	}

	return {
		connectionString: url.toString(),
		ssl: {
			ca,
			rejectUnauthorized: true,
		},
	};
}
