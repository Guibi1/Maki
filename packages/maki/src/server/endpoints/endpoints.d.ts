declare type MakiServerEndpoints = {
    "/dummy/route": {
        GET: {
            params: { body: { foo: "bar" } };
            return: { exemple: true };
        };
    };
};
