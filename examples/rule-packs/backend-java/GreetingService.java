// java/layering — the service holds business logic and delegates persistence to
// a repository; the controller (not shown) stays thin and calls this service.
// java/input-validation — inputs are validated at the boundary.
package com.example.greeting;

public class GreetingService {

    private final GreetingRepository repository;

    public GreetingService(GreetingRepository repository) {
        this.repository = repository;
    }

    public String greet(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name must not be blank");
        }
        return "Hello, " + repository.normalize(name);
    }
}
