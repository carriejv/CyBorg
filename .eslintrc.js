module.exports = {
    "extends": "airbnb-base",
    "rules": {
        "no-console": 0,
        "max-len": [
            "error",
            { 
                "code": 100,
                "tabWidth": 4,
                "ignoreComments": true,
                "ignoreStrings": true,
                "ignoreTemplateLiterals": true 
            }
        ]
    }
};