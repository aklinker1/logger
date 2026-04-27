import { createLogger } from ".";

const logger = createLogger("dev");

logger.blank();

logger.debug("This is a debug log");
logger.info("This is an info log");
logger.success("This is an success log");
logger.warn("This is an warn log");
logger.error("This is an error log");

logger.blank();

const child = logger.extend("child");

child.debug("This is a debug log");
child.info("This is an info log");
child.success("This is an success log");
child.warn("This is an warn log");
child.error("This is an error log");

logger.blank();

logger.info("Log an object", { a: "a", b: "b", c: "c", d: "d" });
logger.info("Log an error", { err: Error("test"), other: 1 });
logger.error("Log an error as an error", { err: Error("test") });

logger.blank();

createLogger("1").info("Namespace length 1");
createLogger("12").info("Namespace length 2");
createLogger("123").info("Namespace length 3");
createLogger("1234").info("Namespace length 4");
createLogger("12345").info("Namespace length 5");
createLogger("123456").info("Namespace length 6");
createLogger("1234567").info("Namespace length 7");
createLogger("12345678").info("Namespace length 8");

logger.blank();

logger.fatal("This is an fatal log", { error: Error("test") });
