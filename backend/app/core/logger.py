import logging
import sys

def setup_logger(name: str = "ghartak") -> logging.Logger:
    """Configures and returns a centralized logger."""
    logger = logging.getLogger(name)
    
    # If the logger already has handlers, assume it's configured to avoid duplicates
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)
    
    return logger

# Create a default root-level logger for the app
app_logger = setup_logger()
